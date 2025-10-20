#!/usr/bin/env node

/**
 * Test script for Google Vision API
 * Run this to verify your credentials work
 */

const vision = require('@google-cloud/vision');

async function testGoogleVision() {
  console.log('🔍 Testing Google Vision API...');
  
  try {
    // Initialize the client
    const client = new vision.ImageAnnotatorClient();
    console.log('✅ Google Vision client initialized');
    
    // Test with a simple base64 image (1x1 pixel)
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    console.log('📸 Testing with sample image...');
    
    // Test label detection
    const [labelResult] = await client.labelDetection({
      image: { content: Buffer.from(testImage, 'base64') }
    });
    
    console.log('✅ Label detection successful');
    console.log('📊 Labels found:', labelResult.labelAnnotations?.length || 0);
    
    if (labelResult.labelAnnotations && labelResult.labelAnnotations.length > 0) {
      console.log('🏷️  Sample labels:');
      labelResult.labelAnnotations.slice(0, 3).forEach(label => {
        console.log(`   - ${label.description} (${Math.round(label.score * 100)}%)`);
      });
    }
    
    console.log('🎉 Google Vision API is working correctly!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your server: npm run dev');
    console.log('2. Upload an image in the AI Search page');
    console.log('3. You should see real Google Vision results');
    
  } catch (error) {
    console.error('❌ Google Vision API test failed:');
    console.error('Error:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Make sure GOOGLE_APPLICATION_CREDENTIALS is set');
    console.log('2. Verify the JSON key file exists and is valid');
    console.log('3. Check that Vision API is enabled in Google Cloud Console');
    console.log('4. Ensure your service account has Vision API permissions');
  }
}

// Run the test
testGoogleVision();
