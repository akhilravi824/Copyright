const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const { auth } = require('../middleware/auth');
const googleVision = require('../services/googleVision');
const googleReverseImageSearch = require('../services/googleReverseImageSearch');

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

    console.log('🔍 Starting reverse image search for:', imagePath);
    console.log('📸 File details:', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Use Google Vision API (with fallback to mock data)
    console.log('🔍 Using Google Vision API with fallback mode');
    
    let analysis = {};
    let visionResults = [];
    
    try {
      // Get analysis from Google Vision API (or mock data)
      analysis = await googleVision.analyzeImage(imagePath);
      
      // Search for similar cases based on analysis
      visionResults = await googleVision.searchSimilarCases(analysis);
      
      console.log('✅ Google Vision analysis completed:', {
        labelsFound: analysis.labels?.length || 0,
        objectsFound: analysis.objects?.length || 0,
        webEntitiesFound: analysis.webEntities?.length || 0,
        resultsReturned: visionResults.length
      });
    } catch (err) {
      console.error('Google Vision error:', err.message);
      // Fallback to empty results
      analysis = {};
      visionResults = [];
    }

    // Use vision results as primary results
    const allResults = visionResults;

    // Remove duplicates based on URL
    const uniqueResults = allResults.filter((result, index, self) =>
      index === self.findIndex((r) => r.url === result.url)
    );

    const results = uniqueResults.slice(0, 50);

    console.log('✅ AI Reverse Image Search completed:', {
      visionResults: visionResults.length,
      totalBeforeDedup: allResults.length,
      totalAfterDedup: uniqueResults.length,
      finalResultsReturned: results.length,
      labelsFound: analysis.labels?.length || 0,
      objectsFound: analysis.objects?.length || 0,
      webEntitiesFound: analysis.webEntities?.length || 0
    });

    // Log platform breakdown
    if (results.length > 0) {
      const platformCounts = results.reduce((acc, result) => {
        const platform = result.platform || 'Unknown';
        acc[platform] = (acc[platform] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Results by platform:', platformCounts);
    }

    res.json({
      message: 'Image analyzed with Google Vision API',
      imageUrl,
      results: results,
      analysis: {
        labels: analysis.labels || [],
        text: analysis.text || '',
        objects: analysis.objects || [],
        webEntities: analysis.webEntities || [],
        pagesWithMatchingImages: analysis.pagesWithMatchingImages || []
      },
      searchId: Date.now().toString()
    });

  } catch (error) {
    console.error('❌ AI Search error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Server error during image analysis',
      error: error.message
    });
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
        title: 'Copyright Infringement Case',
        similarity: 0.89,
        url: '/incidents/DSP-99887766',
        caseId: 'DSP-99887766',
        description: `Found match for "${query}" in incident report`,
        type: 'incident'
      },
      {
        id: '2',
        title: 'Related Legal Document',
        similarity: 0.76,
        url: '/cases/DSP-55443322',
        caseId: 'DSP-55443322',
        description: `Related to "${query}" in case documentation`,
        type: 'case'
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
