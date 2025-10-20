const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

/**
 * Google Reverse Image Search Service
 * Performs actual Google Images reverse search like images.google.com
 */
class GoogleImageSearchService {
  constructor() {
    // SerpAPI key (optional - for production use)
    this.serpApiKey = process.env.SERPAPI_KEY;
    console.log(this.serpApiKey ? '✅ SerpAPI key configured' : '⚠️ No SerpAPI key - using direct Google search');
  }

  /**
   * Perform reverse image search using Google Images
   * @param {string} imagePath - Path to the uploaded image
   * @returns {Promise<Array>} Search results with platforms
   */
  async searchImage(imagePath) {
    if (this.serpApiKey) {
      return await this.searchWithSerpAPI(imagePath);
    } else {
      return await this.searchWithGoogleDirect(imagePath);
    }
  }

  /**
   * Search using SerpAPI (paid service but very reliable)
   * https://serpapi.com/google-lens-api
   */
  async searchWithSerpAPI(imagePath) {
    try {
      const form = new FormData();
      form.append('image', fs.createReadStream(imagePath));
      form.append('api_key', this.serpApiKey);
      form.append('engine', 'google_lens');

      const response = await axios.post('https://serpapi.com/search', form, {
        headers: form.getHeaders()
      });

      return this.parseSerpAPIResults(response.data);
    } catch (error) {
      console.error('SerpAPI error:', error.message);
      return [];
    }
  }

  /**
   * Search using direct Google Images upload (free but requires parsing)
   * This mimics what happens when you upload to images.google.com
   */
  async searchWithGoogleDirect(imagePath) {
    try {
      console.log('🔍 Performing direct Google reverse image search...');

      // Step 1: Upload image to Google and get search URL
      const searchUrl = await this.uploadToGoogle(imagePath);

      if (!searchUrl) {
        console.log('⚠️ Could not get Google search URL');
        return [];
      }

      console.log('🔗 Google search URL:', searchUrl);

      // Step 2: Fetch and parse the search results page
      const results = await this.parseGoogleResults(searchUrl);

      return results;

    } catch (error) {
      console.error('Google direct search error:', error.message);
      return [];
    }
  }

  /**
   * Upload image to Google Images and get the search URL
   */
  async uploadToGoogle(imagePath) {
    try {
      // Create form data
      const form = new FormData();
      form.append('encoded_image', fs.createReadStream(imagePath));
      form.append('image_content', '');

      // Post to Google Images
      const response = await axios.post(
        'https://www.google.com/searchbyimage/upload',
        form,
        {
          headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400
        }
      );

      // Extract redirect URL
      if (response.headers.location) {
        return response.headers.location;
      }

      // If no redirect, try to extract from response
      const urlMatch = response.data.match(/url=([^&]+)/);
      return urlMatch ? decodeURIComponent(urlMatch[1]) : null;

    } catch (error) {
      if (error.response && error.response.headers.location) {
        return error.response.headers.location;
      }
      console.error('Upload to Google error:', error.message);
      return null;
    }
  }

  /**
   * Parse Google search results page
   */
  async parseGoogleResults(searchUrl) {
    try {
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      const html = response.data;
      const results = [];

      // Parse "Pages that include matching images" section
      const pagesRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
      const matches = [...html.matchAll(pagesRegex)];

      let idCounter = 1;
      for (const match of matches.slice(0, 10)) {
        const url = match[1];
        const title = match[2];

        // Skip Google's own links
        if (url.includes('google.com') || url.startsWith('/')) continue;

        const platform = this.extractPlatformName(url);

        results.push({
          id: `google-search-${idCounter++}`,
          title: title || `Match found on ${platform}`,
          url: url,
          externalUrl: true,
          platform: platform,
          description: `Found via Google reverse image search`,
          type: 'google-match',
          similarity: 0.85,
          source: 'google-images'
        });
      }

      console.log(`✅ Found ${results.length} results from Google Images`);
      return results;

    } catch (error) {
      console.error('Parse Google results error:', error.message);
      return [];
    }
  }

  /**
   * Parse SerpAPI response
   */
  parseSerpAPIResults(data) {
    const results = [];

    if (data.visual_matches) {
      data.visual_matches.forEach((match, index) => {
        const platform = this.extractPlatformName(match.link);

        results.push({
          id: `serp-${index + 1}`,
          title: match.title || `Match found on ${platform}`,
          url: match.link,
          externalUrl: true,
          platform: platform,
          description: match.snippet || 'Visual match found',
          type: match.position === 1 ? 'exact-match' : 'visual-match',
          similarity: match.position <= 3 ? 0.95 : 0.80,
          thumbnail: match.thumbnail,
          source: 'serpapi'
        });
      });
    }

    return results;
  }

  /**
   * Extract platform name from URL
   */
  extractPlatformName(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');

      const platformMap = {
        'amazon.com': 'Amazon',
        'amazon.in': 'Amazon India',
        'amazon.co.uk': 'Amazon UK',
        'ebay.com': 'eBay',
        'aliexpress.com': 'AliExpress',
        'alibaba.com': 'Alibaba',
        'etsy.com': 'Etsy',
        'walmart.com': 'Walmart',
        'target.com': 'Target',
        'shopify.com': 'Shopify',
        'instagram.com': 'Instagram',
        'facebook.com': 'Facebook',
        'pinterest.com': 'Pinterest',
        'twitter.com': 'Twitter',
        'linkedin.com': 'LinkedIn',
        'reddit.com': 'Reddit',
        'youtube.com': 'YouTube',
        'tiktok.com': 'TikTok',
        'bestbuy.com': 'Best Buy',
        'homedepot.com': 'Home Depot',
        'lowes.com': 'Lowes',
        'wayfair.com': 'Wayfair',
        'overstock.com': 'Overstock'
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

module.exports = new GoogleImageSearchService();
