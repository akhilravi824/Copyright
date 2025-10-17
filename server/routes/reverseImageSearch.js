const express = require('express');
const multer = require('multer');
const {
  performSearch,
  ReverseImageSearchError
} = require('../services/reverseImageSearchService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  }
});

router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const { file } = req;
    const { imageUrl, includeMetadata } = req.body;

    if (!file && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image or provide an imageUrl'
      });
    }

    if (!file && imageUrl) {
      try {
        new URL(imageUrl);
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          message: 'Provide a valid, absolute imageUrl for analysis.'
        });
      }
    }

    const result = await performSearch({
      fileBuffer: file?.buffer,
      mimeType: file?.mimetype,
      fileName: file?.originalname,
      imageUrl,
      includeMetadata: includeMetadata !== 'false'
    });

    return res.json(result);
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'Uploaded image exceeds the 10MB size limit'
      });
    }

    if (error instanceof ReverseImageSearchError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    console.error('Reverse image search failed:', error);
    return next(error);
  }
});

module.exports = router;
