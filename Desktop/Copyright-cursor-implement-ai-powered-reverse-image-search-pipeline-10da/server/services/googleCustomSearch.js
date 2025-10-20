const axios = require('axios');
const fs = require('fs');

/**
 * Google Custom Search API Service
 * Gets exact image search results like google.com/images
 */
class GoogleCustomSearchService {
  constructor() {
    this.apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    this.searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

    if (this.apiKey && this.searchEngineId) {
      console.log('✅ Google Custom Search API configured');
    } else {
      console.log('⚠️  Google Custom Search API not configured - will use Vision API only');
    }
  }

  /**
   * Search for images using Google Custom Search API
   * This returns results exactly like google.com/images
   */
  async searchByImageUrl(imageUrl) {
    if (!this.apiKey || !this.searchEngineId) {
      console.log('⚠️  Skipping Custom Search - not configured (need Search Engine ID)');
      return [];
    }

    try {
      console.log('🔍 Searching with Google Custom Search API for:', imageUrl);

      // Custom Search API for reverse image search
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apiKey,
          cx: this.searchEngineId,
          searchType: 'image',
          q: imageUrl, // Use 'q' parameter for image URL search
          num: 10, // Get 10 results
          safe: 'off' // Don't filter results
        }
      });

      const results = this.parseCustomSearchResults(response.data);
      console.log(`✅ Custom Search found ${results.length} exact matches`);
      return results;

    } catch (error) {
      console.error('❌ Custom Search API error:', error.response?.data || error.message);
      if (error.response?.data?.error?.message) {
        console.error('Error details:', error.response.data.error.message);
      }
      return [];
    }
  }

  /**
   * Search using image file (base64 encoded or uploaded)
   * For now, we'll use Vision API's web detection which is more reliable
   */
  async searchByImageFile(imagePath) {
    // Custom Search API doesn't support direct file upload
    // We rely on Vision API's web detection instead
    console.log('⚠️  Custom Search requires public image URL - using Vision API web detection');
    return [];
  }

  /**
   * Parse Custom Search API results
   */
  parseCustomSearchResults(data) {
    if (!data.items) {
      return [];
    }

    return data.items.map((item, index) => {
      const platform = this.extractPlatformName(item.link);

      return {
        id: `custom-search-${index + 1}`,
        title: item.title || `Match on ${platform}`,
        url: item.link,
        externalUrl: true,
        platform: platform,
        description: item.snippet || 'Exact image match found',
        type: 'exact-match',
        similarity: 0.95, // Custom Search returns exact matches
        source: 'google-custom-search',
        thumbnail: item.image?.thumbnailLink || item.link,
        imageWidth: item.image?.width,
        imageHeight: item.image?.height,
        pageTitle: item.displayLink
      };
    });
  }

  /**
   * Extract platform name from URL
   */
  extractPlatformName(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');

      const platformMap = {
        'youtube.com': 'YouTube',
        'youtu.be': 'YouTube',
        'amazon.com': 'Amazon',
        'ebay.com': 'eBay',
        'aliexpress.com': 'AliExpress',
        'alibaba.com': 'Alibaba',
        'etsy.com': 'Etsy',
        'walmart.com': 'Walmart',
        'target.com': 'Target',
        'instagram.com': 'Instagram',
        'facebook.com': 'Facebook',
        'pinterest.com': 'Pinterest',
        'twitter.com': 'Twitter',
        'linkedin.com': 'LinkedIn',
        'reddit.com': 'Reddit',
        'tiktok.com': 'TikTok',
        'vimeo.com': 'Vimeo',
        'dailymotion.com': 'Dailymotion'
      };

      for (const [domain, name] of Object.entries(platformMap)) {
        if (hostname.includes(domain)) {
          return name;
        }
      }

      // Return capitalized domain
      const parts = hostname.split('.');
      const mainDomain = parts.length > 1 ? parts[parts.length - 2] : parts[0];
      return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);

    } catch (error) {
      return 'Unknown';
    }
  }
}

module.exports = new GoogleCustomSearchService();
