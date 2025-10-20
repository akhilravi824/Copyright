const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const cheerio = require('cheerio');
const { HttpsProxyAgent } = require('https-proxy-agent');

/**
 * Google Reverse Image Search Service
 * Uses direct Google search with proxy rotation to bypass CAPTCHA
 */
class GoogleReverseImageSearch {
  constructor() {
    // Load proxies from environment variable
    const proxyList = process.env.PROXY_LIST || '';
    this.proxies = proxyList
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    this.currentProxyIndex = 0;
    this.useProxy = process.env.USE_PROXY === 'true';

    console.log('✅ Google Reverse Image Search service initialized');
    if (this.useProxy && this.proxies.length > 0) {
      console.log(`📡 Proxy rotation enabled with ${this.proxies.length} proxies`);
    } else if (this.useProxy && this.proxies.length === 0) {
      console.log('⚠️  USE_PROXY is true but no proxies configured in PROXY_LIST');
    } else {
      console.log('📡 Proxy disabled - using direct connection');
    }
  }

  /**
   * Get next proxy in rotation
   */
  getNextProxy() {
    if (!this.useProxy || this.proxies.length === 0) {
      return null;
    }

    const proxy = this.proxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    return proxy;
  }

  /**
   * Upload image directly to Google and get search results
   * This is the most reliable method - same as google.com/imghp "upload image"
   */
  async searchByImage(imagePath) {
    try {
      console.log('🔍 Performing direct Google reverse image search...');

      // Step 1: Upload image to Google
      const searchUrl = await this.uploadToGoogle(imagePath);

      if (!searchUrl) {
        console.log('⚠️  Failed to upload to Google, trying alternative method...');
        return await this.searchByImageUrl(imagePath);
      }

      console.log('✅ Upload successful, fetching results from:', searchUrl);

      // Step 2: Get search results
      const results = await this.fetchSearchResults(searchUrl);

      console.log(`✅ Found ${results.length} results from Google Reverse Image Search`);
      return results;

    } catch (error) {
      console.error('❌ Google Reverse Image Search error:', error.message);
      return [];
    }
  }

  /**
   * Upload image directly to Google's reverse image search
   * Returns the search results URL
   */
  async uploadToGoogle(imagePath) {
    try {
      const form = new FormData();
      form.append('encoded_image', fs.createReadStream(imagePath), {
        filename: 'image.jpg',
        contentType: 'image/jpeg'
      });
      form.append('image_content', '');

      const proxy = this.getNextProxy();
      const config = {
        headers: {
          ...form.getHeaders(),
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Origin': 'https://www.google.com',
          'Referer': 'https://www.google.com/imghp'
        },
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
      };

      // Add proxy if enabled
      if (proxy) {
        config.httpsAgent = new HttpsProxyAgent(proxy);
        console.log(`🔄 Using proxy: ${proxy}`);
      }

      // Upload to Google's searchbyimage endpoint
      const response = await axios.post(
        'https://www.google.com/searchbyimage/upload',
        form,
        config
      );

      // Extract the search URL from response
      let searchUrl = response.request?.res?.responseUrl || response.config?.url;

      // If we got redirected, that's the search results URL
      if (response.request?.res?.responseUrl) {
        searchUrl = response.request.res.responseUrl;
      }

      return searchUrl;

    } catch (error) {
      if (error.response?.status === 302 || error.response?.status === 303) {
        return error.response.headers.location;
      }
      console.error('❌ Upload to Google failed:', error.message);
      return null;
    }
  }

  /**
   * Alternative method: Search by creating a direct Google search URL
   */
  async searchByImageUrl(imagePath) {
    try {
      // This method requires a publicly accessible URL
      // For local files, we'd need to host them temporarily
      console.log('⚠️  Direct URL search requires public image URL');
      return [];
    } catch (error) {
      console.error('❌ Search by URL failed:', error.message);
      return [];
    }
  }

  /**
   * Fetch and parse search results from Google
   */
  async fetchSearchResults(searchUrl) {
    try {
      const proxy = this.getNextProxy();
      const config = {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.google.com/'
        }
      };

      // Add proxy if enabled
      if (proxy) {
        config.httpsAgent = new HttpsProxyAgent(proxy);
        console.log(`🔄 Using proxy: ${proxy}`);
      }

      const response = await axios.get(searchUrl, config);
      const html = response.data;

      // Parse results
      return this.parseSearchResults(html);

    } catch (error) {
      console.error('❌ Failed to fetch search results:', error.message);
      return [];
    }
  }

  /**
   * Parse Google search results HTML
   */
  parseSearchResults(html) {
    const results = [];

    try {
      const $ = cheerio.load(html);

      // Method 1: Find all search result links
      $('a[href]').each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href');

        // Skip Google's own links and invalid URLs
        if (!href || href.startsWith('/search') || href.startsWith('#') || href.includes('google.com')) {
          return;
        }

        // Extract actual URL from Google redirect
        let actualUrl = href;
        if (href.includes('/url?q=')) {
          const match = href.match(/\/url\?q=([^&]+)/);
          if (match) {
            actualUrl = decodeURIComponent(match[1]);
          }
        }

        // Get title from link text or nearby heading
        const title = $link.text().trim() ||
                     $link.find('h3').text().trim() ||
                     $link.closest('div').find('h3').text().trim() ||
                     'Match found';

        // Skip empty results
        if (!title || title.length < 3) {
          return;
        }

        // Check if URL is valid
        if (this.isValidResultUrl(actualUrl)) {
          const platform = this.extractPlatformName(actualUrl);

          results.push({
            id: `google-search-${index + 1}`,
            title: title,
            url: actualUrl,
            externalUrl: true,
            platform: platform,
            description: $link.closest('div').find('.VwiC3b, .s3v9rd').text().trim() || 'Found via Google reverse image search',
            type: 'google-reverse-search',
            similarity: 0.88,
            source: 'google-reverse-image-search'
          });
        }
      });

      // Method 2: Look for image results specifically
      $('div[data-lpage], div[data-ved]').each((index, element) => {
        const $div = $(element);
        const $link = $div.find('a').first();
        const href = $link.attr('href');
        const title = $link.find('h3').text().trim() || $div.find('h3').text().trim();
        const description = $div.find('.VwiC3b, .s3v9rd, .st').text().trim();

        if (href && this.isValidResultUrl(href)) {
          const platform = this.extractPlatformName(href);

          // Avoid duplicates
          if (!results.find(r => r.url === href)) {
            results.push({
              id: `google-image-${index + 1}`,
              title: title || `Match on ${platform}`,
              url: href,
              externalUrl: true,
              platform: platform,
              description: description || 'Image found on this page',
              type: 'google-image-match',
              similarity: 0.90,
              source: 'google-reverse-image-search'
            });
          }
        }
      });

      // Remove duplicates
      const uniqueResults = results.filter((result, index, self) =>
        index === self.findIndex((r) => r.url === result.url)
      );

      return uniqueResults.slice(0, 30);

    } catch (error) {
      console.error('❌ Error parsing search results:', error.message);
      return [];
    }
  }

  /**
   * Check if URL is a valid result (not Google's own pages)
   */
  isValidResultUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Exclude Google's own URLs
    const excludePatterns = [
      'google.com/search',
      'google.com/url',
      'google.com/imgres',
      'accounts.google.com',
      'policies.google.com',
      'support.google.com',
      'webcache.googleusercontent.com'
    ];

    const isGoogleUrl = excludePatterns.some(pattern => url.includes(pattern));
    const isValidUrl = url.startsWith('http://') || url.startsWith('https://');

    return isValidUrl && !isGoogleUrl;
  }

  /**
   * Extract platform name from URL
   */
  extractPlatformName(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '').replace('m.', '');

      const platformMap = {
        'youtube.com': 'YouTube',
        'youtu.be': 'YouTube',
        'ytimg.com': 'YouTube',
        'yt3.ggpht.com': 'YouTube',
        'amazon.com': 'Amazon',
        'amazon.co.uk': 'Amazon',
        'amzn.to': 'Amazon',
        'ebay.com': 'eBay',
        'ebay.co.uk': 'eBay',
        'aliexpress.com': 'AliExpress',
        'alibaba.com': 'Alibaba',
        'etsy.com': 'Etsy',
        'walmart.com': 'Walmart',
        'target.com': 'Target',
        'instagram.com': 'Instagram',
        'cdninstagram.com': 'Instagram',
        'facebook.com': 'Facebook',
        'fb.com': 'Facebook',
        'fbcdn.net': 'Facebook',
        'pinterest.com': 'Pinterest',
        'pinimg.com': 'Pinterest',
        'twitter.com': 'Twitter',
        'x.com': 'Twitter',
        'twimg.com': 'Twitter',
        'linkedin.com': 'LinkedIn',
        'licdn.com': 'LinkedIn',
        'reddit.com': 'Reddit',
        'redd.it': 'Reddit',
        'tiktok.com': 'TikTok',
        'tiktokcdn.com': 'TikTok',
        'vimeo.com': 'Vimeo',
        'dailymotion.com': 'Dailymotion',
        'shopify.com': 'Shopify',
        'myshopify.com': 'Shopify'
      };

      for (const [domain, name] of Object.entries(platformMap)) {
        if (hostname.includes(domain)) {
          return name;
        }
      }

      // Return capitalized domain name
      const parts = hostname.split('.');
      const mainDomain = parts.length > 1 ? parts[parts.length - 2] : parts[0];
      return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);

    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Get random user agent to avoid detection
   */
  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
}

module.exports = new GoogleReverseImageSearch();
