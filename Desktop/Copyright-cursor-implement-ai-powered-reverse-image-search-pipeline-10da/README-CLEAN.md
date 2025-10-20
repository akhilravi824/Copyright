# Google Vision AI Search - Clean Implementation

A minimal, clean implementation of Google Vision AI-powered reverse image search without database dependencies.

## 🎯 Features

- **Clean Architecture**: No MongoDB, no complex database setup
- **Google Vision API**: Real image analysis with fallback mode
- **Simple Authentication**: Hardcoded demo user (no database required)
- **Web Search Results**: Returns actual web URLs where images appear
- **Minimal Dependencies**: Only essential packages included

## 🚀 Quick Start

### Backend (Node.js)

1. **Install dependencies**:
   ```bash
   cd server-clean
   npm install
   ```

2. **Set up Google Vision API** (optional):
   ```bash
   # Download credentials from Google Cloud Console
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/credentials.json"
   ```

3. **Start the server**:
   ```bash
   npm start
   # Server runs on http://localhost:5001
   ```

### Frontend (HTML/JavaScript)

1. **Open the HTML file**:
   ```bash
   # Simply open client-clean/index.html in your browser
   open client-clean/index.html
   ```

2. **Login credentials**:
   - Email: `admin@dsp.com`
   - Password: `admin123`

## 📁 Project Structure

```
├── server-clean/
│   ├── index.js          # Single file server with all functionality
│   ├── package.json      # Minimal dependencies
│   └── uploads/          # Temporary image storage (auto-created)
│
└── client-clean/
    ├── index.html        # Standalone HTML file with React
    └── package.json      # Optional React setup
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with demo credentials
- `GET /api/auth/me` - Get current user info

### AI Search
- `POST /api/ai-search/image` - Upload image for reverse search
- `GET /api/health` - Health check endpoint

## 🎨 Features

### Backend Features
- ✅ **Google Vision API Integration** with fallback mode
- ✅ **Image Upload Handling** (5MB limit, multiple formats)
- ✅ **JWT Authentication** with fallback secret
- ✅ **CORS Support** for Vercel deployments
- ✅ **Automatic File Cleanup** after processing
- ✅ **Error Handling** with graceful fallbacks

### Frontend Features
- ✅ **Clean UI** with Tailwind CSS
- ✅ **Image Upload** with drag-and-drop interface
- ✅ **Real-time Results** with platform badges
- ✅ **External Links** open in new tabs
- ✅ **Responsive Design** for mobile and desktop
- ✅ **Loading States** and error handling

## 🔍 How It Works

1. **User uploads an image** through the web interface
2. **Server processes the image** using Google Vision API
3. **AI analyzes the image** for labels, objects, and web entities
4. **System searches the web** for matching images and pages
5. **Results are returned** with platform information and confidence scores
6. **Users can click** "View Page" to visit external websites

## 🌐 Deployment

### Vercel Deployment

1. **Deploy backend**:
   ```bash
   # In server-clean directory
   vercel --prod
   ```

2. **Set environment variables**:
   - `GOOGLE_APPLICATION_CREDENTIALS` (optional)
   - `JWT_SECRET` (optional, has fallback)

3. **Update frontend**:
   - Change `API_BASE_URL` in `index.html` to your Vercel URL

### Local Development

1. **Start backend**: `cd server-clean && npm start`
2. **Open frontend**: Open `client-clean/index.html` in browser
3. **Login**: Use `admin@dsp.com` / `admin123`

## 🔧 Configuration

### Environment Variables

```bash
# Optional - Google Vision API
GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"

# Optional - JWT Secret (has fallback)
JWT_SECRET="your-secret-key"

# Optional - Port (defaults to 5001)
PORT=5001
```

### Google Vision API Setup

1. **Create Google Cloud Project**
2. **Enable Vision API**
3. **Create Service Account**
4. **Download JSON credentials**
5. **Set environment variable**

## 📊 Sample Results

The system returns results like:

```json
{
  "results": [
    {
      "title": "Product on Amazon",
      "description": "Found on Amazon",
      "url": "https://www.amazon.com/product-example",
      "platform": "Amazon",
      "type": "page-match",
      "similarity": 0.95,
      "externalUrl": true
    }
  ],
  "analysis": {
    "labels": [
      { "description": "Product", "confidence": 95 },
      { "description": "Brand", "confidence": 88 }
    ]
  }
}
```

## 🎯 Benefits of Clean Implementation

- **No Database Required**: Works without MongoDB or any database
- **Minimal Dependencies**: Only essential packages
- **Easy Deployment**: Single file server, standalone HTML client
- **Fast Setup**: Get running in minutes
- **Fallback Mode**: Works even without Google Vision credentials
- **Production Ready**: Includes error handling and security features

## 🔒 Security Features

- **JWT Authentication** with configurable secret
- **File Type Validation** (images only)
- **File Size Limits** (5MB max)
- **CORS Protection** with allowed origins
- **Input Sanitization** and validation
- **Automatic File Cleanup** after processing

## 🚀 Future Enhancements

- **Batch Processing**: Upload multiple images
- **Search History**: Store recent searches
- **Advanced Filters**: Filter by platform, confidence, etc.
- **Export Results**: Download results as CSV/PDF
- **API Rate Limiting**: Prevent abuse
- **Caching**: Cache results for repeated searches

---

**Clean Google Vision AI Search** - Minimal implementation for maximum functionality
