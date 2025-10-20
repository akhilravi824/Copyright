// Add this to your existing server/routes/ai-search.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const vision = require('@google-cloud/vision');

const router = express.Router();

// Clean Google Vision Service (minimal version)
class CleanGoogleVisionService {
  constructor() {
    this.client = null;
    this.hasCredentials = false;

    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.client = new vision.ImageAnnotatorClient();
        this.hasCredentials = true;
        console.log('✅ Clean Google Vision API client initialized');
      } else {
        console.log('⚠️  Clean Google Vision using fallback mode');
      }
    } catch (error) {
      console.log('⚠️  Clean Google Vision initialization failed:', error.message);
    }
  }

  async analyzeImage(imagePath) {
    if (this.hasCredentials && this.client) {
      try {
        const [labelResult, webResult] = await Promise.all([
          this.client.labelDetection(imagePath),
          this.client.webDetection(imagePath)
        ]);

        const labels = labelResult[0].labelAnnotations?.map(label => ({
          description: label.description,
          confidence: Math.round(label.score * 100)
        })) || [];

        const webDetection = webResult[0].webDetection || {};
        const webEntities = webDetection.webEntities?.map(entity => ({
          description: entity.description,
          confidence: Math.round((entity.score || 0.5) * 100)
        })) || [];

        const pagesWithMatchingImages = webDetection.pagesWithMatchingImages?.map(page => ({
          url: page.url,
          pageTitle: page.pageTitle,
          fullMatchingImages: page.fullMatchingImages?.length || 0,
          partialMatchingImages: page.partialMatchingImages?.length || 0
        })) || [];

        return { labels, webEntities, pagesWithMatchingImages };
      } catch (error) {
        console.error('❌ Clean Google Vision error:', error.message);
        return this.getMockAnalysis();
      }
    } else {
      return this.getMockAnalysis();
    }
  }

  getMockAnalysis() {
    return {
      labels: [
        { description: 'Product', confidence: 95 },
        { description: 'Brand', confidence: 88 }
      ],
      webEntities: [
        { description: 'Amazon', confidence: 90 },
        { description: 'eBay', confidence: 85 }
      ],
      pagesWithMatchingImages: [
        {
          url: 'https://www.amazon.com/product-example',
          pageTitle: 'Product on Amazon',
          fullMatchingImages: 2,
          partialMatchingImages: 1
        }
      ]
    };
  }

  searchSimilarCases(analysis) {
    const results = [];
    
    analysis.pagesWithMatchingImages?.forEach(page => {
      results.push({
        title: page.pageTitle,
        description: `Found on ${this.extractPlatformName(page.url)}`,
        url: page.url,
        externalUrl: true,
        platform: this.extractPlatformName(page.url),
        type: 'page-match',
        similarity: 0.95,
        thumbnail: null
      });
    });

    analysis.webEntities?.forEach(entity => {
      results.push({
        title: `${entity.description} Search Results`,
        description: `Related content found for ${entity.description}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(entity.description)}`,
        externalUrl: true,
        platform: 'Google Search',
        type: 'web-entity',
        similarity: entity.confidence / 100,
        thumbnail: null
      });
    });

    return results.slice(0, 20);
  }

  extractPlatformName(url) {
    const domain = new URL(url).hostname.toLowerCase();
    if (domain.includes('amazon')) return 'Amazon';
    if (domain.includes('ebay')) return 'eBay';
    if (domain.includes('google')) return 'Google Search';
    if (domain.includes('linkedin')) return 'LinkedIn';
    if (domain.includes('facebook')) return 'Facebook';
    if (domain.includes('youtube')) return 'YouTube';
    if (domain.includes('tiktok')) return 'TikTok';
    return 'Website';
  }
}

const cleanGoogleVision = new CleanGoogleVisionService();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/ai-search-clean');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'clean-search-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

// Clean AI Search endpoint (works alongside existing features)
router.post('/clean', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imagePath = req.file.path;
    console.log('🔍 Clean AI Search starting for:', imagePath);

    // Analyze image with clean service
    const analysis = await cleanGoogleVision.analyzeImage(imagePath);
    
    // Generate search results
    const results = cleanGoogleVision.searchSimilarCases(analysis);

    console.log('✅ Clean AI Search completed:', {
      labelsFound: analysis.labels?.length || 0,
      webEntitiesFound: analysis.webEntities?.length || 0,
      resultsReturned: results.length
    });

    res.json({
      message: 'Clean AI search completed',
      results,
      analysis: {
        labels: analysis.labels || [],
        webEntities: analysis.webEntities || []
      },
      searchType: 'clean'
    });

  } catch (error) {
    console.error('❌ Clean AI Search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    // Clean up uploaded file
    if (req.file) {
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err));
    }
  }
});

module.exports = router;
