/**
 * Test script for proxy rotation in Google Reverse Image Search
 */

require('dotenv').config();
const googleReverseImageSearch = require('./services/googleReverseImageSearch');
const path = require('path');

async function testProxyRotation() {
  console.log('\n🧪 Testing Proxy Rotation for Google Reverse Image Search\n');
  console.log('='.repeat(60));

  const testImage = path.join(__dirname, '../test_no_creds.png');

  console.log(`\n📸 Test Image: ${testImage}`);
  console.log(`\n🔍 Starting reverse image search with proxy rotation...\n`);

  try {
    const results = await googleReverseImageSearch.searchByImage(testImage);

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Search completed!`);
    console.log(`📊 Total results found: ${results.length}\n`);

    if (results.length > 0) {
      console.log('Top 5 results:');
      results.slice(0, 5).forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.title}`);
        console.log(`   Platform: ${result.platform}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Similarity: ${(result.similarity * 100).toFixed(0)}%`);
      });
    } else {
      console.log('⚠️  No results found. This could mean:');
      console.log('   - Proxies are not working (being blocked by Google)');
      console.log('   - Image is unique and not found on the web');
      console.log('   - Google detected automated requests');
      console.log('\n💡 Recommendation: Try using paid proxy services:');
      console.log('   - ScraperAPI: http://scraperapi:API_KEY@proxy.scraperapi.com:8001');
      console.log('   - WebShare: http://username:password@proxy.webshare.io:80');
      console.log('   - Bright Data: http://username:password@brd.superproxy.io:22225');
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error('\nStack trace:', error.stack);
  }
}

// Run the test
testProxyRotation().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
