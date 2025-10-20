#!/bin/bash

echo "🧹 Google Vision AI Search - Clean Implementation Setup"
echo "======================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Setup backend
echo ""
echo "🔧 Setting up backend..."
cd server-clean

if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
else
    echo "✅ Backend dependencies already installed"
fi

# Create uploads directory
mkdir -p uploads
echo "✅ Created uploads directory"

# Check for Google Vision credentials
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "⚠️  GOOGLE_APPLICATION_CREDENTIALS not set - will use fallback mode"
    echo "   To enable Google Vision API:"
    echo "   1. Create a Google Cloud project"
    echo "   2. Enable Vision API"
    echo "   3. Create service account and download JSON"
    echo "   4. Set GOOGLE_APPLICATION_CREDENTIALS environment variable"
else
    echo "✅ Google Vision credentials configured"
fi

cd ..

echo ""
echo "🎨 Frontend setup..."
echo "✅ Frontend is ready (standalone HTML file)"

echo ""
echo "🚀 Starting the application..."
echo ""
echo "Backend will start on: http://localhost:5001"
echo "Frontend: Open client-clean/index.html in your browser"
echo ""
echo "Login credentials:"
echo "  Email: admin@dsp.com"
echo "  Password: admin123"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the backend server
cd server-clean
npm start
