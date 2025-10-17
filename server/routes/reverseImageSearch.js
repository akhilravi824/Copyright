const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { auth } = require('../middleware/auth');
const reverseImageSearchService = require('../services/reverseImageSearchService');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    reverseImageSearchService
      .ensureStorage()
      .then(() => cb(null, reverseImageSearchService.constants.UPLOADS_DIR))
      .catch((error) => cb(error));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const uniqueSuffix = `${timestamp}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname) || '.png';
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype?.startsWith('image/')) {
    cb(new Error('Only image uploads are supported.'));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

function normaliseTags(rawTags) {
  if (!rawTags) {
    return '';
  }
  if (Array.isArray(rawTags)) {
    return rawTags.join(',');
  }
  return String(rawTags);
}

router.get('/reference', auth, async (req, res) => {
  try {
    const images = (await reverseImageSearchService.listReferenceImages()).map((image) => ({
      ...image,
      imageUrl: image.fileName ? `/uploads/reference-images/${image.fileName}` : null,
    }));
    res.json({ images });
  } catch (error) {
    console.error('Failed to list reference images', error);
    res.status(500).json({ message: 'Unable to load reference images.' });
  }
});

router.post('/reference', auth, upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'An image file is required.' });
    return;
  }

  try {
    const {
      title,
      description,
      sourceUrl,
      tags,
      fingerprint,
      fingerprintAlgorithm,
      fingerprintLength,
    } = req.body;

    if (!fingerprint || !fingerprintAlgorithm) {
      throw new Error('Fingerprint data is required for indexing.');
    }

    const record = await reverseImageSearchService.addReferenceImage({
      title,
      description,
      sourceUrl,
      tags: normaliseTags(tags),
      fingerprint,
      fingerprintAlgorithm,
      fingerprintLength,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user
        ? {
            id: req.user.id || req.user.userId || req.user._id?.toString() || null,
            email: req.user.email || null,
            role: req.user.role || null,
          }
        : null,
    });

    res.status(201).json({
      image: {
        ...record,
        imageUrl: `/uploads/reference-images/${record.fileName}`,
      },
    });
  } catch (error) {
    console.error('Failed to create reference image', error);
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(400).json({ message: error.message || 'Unable to create reference image.' });
  }
});

router.delete('/reference/:id', auth, async (req, res) => {
  try {
    const removed = await reverseImageSearchService.deleteReferenceImage(req.params.id);

    if (!removed) {
      res.status(404).json({ message: 'Reference image not found.' });
      return;
    }

    if (removed.fileName) {
      const absolutePath = path.join(reverseImageSearchService.constants.UPLOADS_DIR, removed.fileName);
      await fs.unlink(absolutePath).catch(() => {});
    }

    res.json({
      success: true,
      removed: {
        id: removed.id,
        title: removed.title,
      },
    });
  } catch (error) {
    console.error('Failed to delete reference image', error);
    res.status(500).json({ message: 'Unable to delete reference image.' });
  }
});

router.post('/search', auth, async (req, res) => {
  try {
    const {
      fingerprint,
      fingerprintAlgorithm,
      fingerprintLength,
      limit,
      minSimilarity,
    } = req.body;

    if (!fingerprint || !fingerprintAlgorithm) {
      res.status(400).json({ message: 'Fingerprint data is required for searching.' });
      return;
    }

    const { matches, summary } = await reverseImageSearchService.findSimilarImages({
      fingerprint,
      fingerprintAlgorithm,
      fingerprintLength,
      limit,
      minSimilarity,
    });

    res.json({
      query: {
        fingerprintLength: fingerprint?.length || null,
        fingerprintAlgorithm,
        limit: Number(limit) || 10,
        minSimilarity: Number(minSimilarity) || 0,
      },
      matches: matches.map((match) => ({
        ...match,
        imageUrl: match.fileName ? `/uploads/reference-images/${match.fileName}` : null,
      })),
      summary,
    });
  } catch (error) {
    console.error('Reverse image search failed', error);
    res.status(500).json({ message: error.message || 'Reverse image search failed.' });
  }
});

module.exports = router;
