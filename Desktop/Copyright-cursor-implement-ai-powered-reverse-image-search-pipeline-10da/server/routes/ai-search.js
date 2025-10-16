const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/ai-search');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'search-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// @route   POST /api/ai-search/image
// @desc    Upload image for reverse search
// @access  Private
router.post('/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imagePath = req.file.path;
    const imageUrl = `/uploads/ai-search/${req.file.filename}`;

    // TODO: Implement actual AI/ML processing here
    // For now, return mock results
    const mockResults = [
      {
        id: '1',
        title: 'Similar Image 1',
        similarity: 0.95,
        url: 'https://example.com/image1.jpg',
        caseId: 'DSP-12345678',
        description: 'High similarity match found'
      },
      {
        id: '2', 
        title: 'Similar Image 2',
        similarity: 0.87,
        url: 'https://example.com/image2.jpg',
        caseId: 'DSP-87654321',
        description: 'Moderate similarity match'
      },
      {
        id: '3',
        title: 'Similar Image 3', 
        similarity: 0.72,
        url: 'https://example.com/image3.jpg',
        caseId: 'DSP-11223344',
        description: 'Lower similarity match'
      }
    ];

    res.json({
      message: 'Image uploaded successfully',
      imageUrl,
      results: mockResults,
      searchId: Date.now().toString()
    });

  } catch (error) {
    console.error('AI Search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/ai-search/text
// @desc    Search by text description
// @access  Private
router.post('/text', auth, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length < 3) {
      return res.status(400).json({ message: 'Query must be at least 3 characters' });
    }

    // TODO: Implement actual text-to-image search here
    // For now, return mock results
    const mockResults = [
      {
        id: '1',
        title: 'Text Match 1',
        similarity: 0.89,
        url: 'https://example.com/text1.jpg',
        caseId: 'DSP-99887766',
        description: `Found match for "${query}"`
      },
      {
        id: '2',
        title: 'Text Match 2', 
        similarity: 0.76,
        url: 'https://example.com/text2.jpg',
        caseId: 'DSP-55443322',
        description: `Related to "${query}"`
      }
    ];

    res.json({
      message: 'Text search completed',
      query,
      results: mockResults,
      searchId: Date.now().toString()
    });

  } catch (error) {
    console.error('AI Text Search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/ai-search/history
// @desc    Get search history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    // TODO: Implement actual search history from database
    const mockHistory = [
      {
        id: '1',
        type: 'image',
        query: 'uploaded_image.jpg',
        resultsCount: 3,
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '2',
        type: 'text',
        query: 'copyright infringement',
        resultsCount: 2,
        timestamp: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    res.json({
      history: mockHistory
    });

  } catch (error) {
    console.error('AI Search history error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
