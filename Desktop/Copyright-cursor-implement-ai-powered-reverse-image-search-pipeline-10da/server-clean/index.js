const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');

// Google Vision API
const vision = require('@google-cloud/vision');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    /\.vercel\.app$/
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Simple authentication middleware (no database required)
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Google Vision Service
class GoogleVisionService {
  constructor() {
    this.client = null;
    this.hasCredentials = false;

    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.client = new vision.ImageAnnotatorClient();
        this.hasCredentials = true;
        console.log('✅ Google Vision API client initialized');
      } else {
        console.log('⚠️  Using fallback mode - no Google Vision credentials');
      }
    } catch (error) {
      console.log('⚠️  Google Vision initialization failed:', error.message);
    }
  }

  async analyzeImage(imagePath) {
    if (this.hasCredentials && this.client) {
      try {
        console.log('🔍 Analyzing image with Google Vision API');
        return await this.performRealAnalysis(imagePath);
      } catch (error) {
        console.error('❌ Google Vision error:', error.message);
        return this.getMockAnalysis();
      }
    } else {
      console.log('🔍 Using mock analysis');
      return this.getMockAnalysis();
    }
  }

  async performRealAnalysis(imagePath) {
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

    return {
      labels,
      webEntities,
      pagesWithMatchingImages
    };
  }

  getMockAnalysis() {
    return {
      labels: [
        { description: 'Product', confidence: 95 },
        { description: 'Brand', confidence: 88 },
        { description: 'Logo', confidence: 82 }
      ],
      webEntities: [
        { description: 'Amazon', confidence: 90 },
        { description: 'eBay', confidence: 85 },
        { description: 'E-commerce', confidence: 80 }
      ],
      pagesWithMatchingImages: [
        {
          url: 'https://www.amazon.com/product-example',
          pageTitle: 'Product on Amazon',
          fullMatchingImages: 2,
          partialMatchingImages: 1
        },
        {
          url: 'https://www.ebay.com/item-example',
          pageTitle: 'Item on eBay',
          fullMatchingImages: 1,
          partialMatchingImages: 3
        }
      ]
    };
  }

  searchSimilarCases(analysis) {
    const results = [];
    
    // Generate results from pages with matching images
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

    // Generate results from web entities
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

    return results.slice(0, 20); // Limit to 20 results
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

const googleVision = new GoogleVisionService();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
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

// Routes

// Simple login (no database required)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple hardcoded user for demo
  if (email === 'admin@dsp.com' && password === 'admin123') {
    const token = jwt.sign(
      { userId: 'demo-user', email, role: 'admin' },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: 'demo-user',
        firstName: 'Admin',
        lastName: 'User',
        email,
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Get current user
app.get('/api/auth/me', auth, (req, res) => {
  res.json({
    user: {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// AI Search - Image upload
app.post('/api/ai-search/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imagePath = req.file.path;
    console.log('🔍 Starting reverse image search for:', imagePath);

    // Analyze image
    const analysis = await googleVision.analyzeImage(imagePath);
    
    // Generate search results
    const results = googleVision.searchSimilarCases(analysis);

    console.log('✅ AI Reverse Image Search completed:', {
      labelsFound: analysis.labels?.length || 0,
      webEntitiesFound: analysis.webEntities?.length || 0,
      resultsReturned: results.length
    });

    res.json({
      message: 'Image analyzed successfully',
      results,
      analysis: {
        labels: analysis.labels || [],
        webEntities: analysis.webEntities || []
      }
    });

  } catch (error) {
    console.error('❌ AI Search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    // Clean up uploaded file
    if (req.file) {
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err));
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    googleVision: googleVision.hasCredentials ? 'configured' : 'fallback'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Clean Google Vision AI Search API running on port ${PORT}`);
  console.log(`📊 Google Vision: ${googleVision.hasCredentials ? 'Enabled' : 'Fallback Mode'}`);
});

module.exports = app;
