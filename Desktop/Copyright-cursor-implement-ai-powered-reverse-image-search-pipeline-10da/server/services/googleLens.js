const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const cheerio = require('cheerio');

/**
 * Google Lens Service
 * Implements reverse image search using Google Lens API
 * This is the same technology used in lens.google.com and Google mobile app
 */
class GoogleLensService {
  constructor() {
    this.uploadEndpoint = 'https://lens.google.com/v3/upload';
    this.searchEndpoint = 'https://lens.google.com/uploadbyurl';
    console.log('✅ Google Lens service initialized');
  }

  /**
   * Upload image to Google Lens and get search results
   * This mimics the exact behavior of uploading to lens.google.com
   */
  async searchImage(imagePath) {
    try {
      console.log('🔍 Performing Google Lens reverse image search...');

      // Step 1: Upload image to Google Lens
      const uploadUrl = await this.uploadImageToLens(imagePath);

      if (!uploadUrl) {
        console.log('⚠️  Could not upload to Google Lens, using fallback');
        return [];
      }

      console.log('✅ Image uploaded to Google Lens:', uploadUrl);

      // Step 2: Get search results from Lens
      const results = await this.getLensResults(uploadUrl);

      console.log(`✅ Found ${results.length} results from Google Lens`);
      return results;

    } catch (error) {
      console.error('❌ Google Lens search error:', error.message);
      return [];
    }
  }

  /**
   * Upload image file to Google Lens
   * Returns the Lens search URL
   */
  async uploadImageToLens(imagePath) {
    try {
      const form = new FormData();
      form.append('encoded_image', fs.createReadStream(imagePath), {
        filename: 'upload.jpg',
        contentType: 'image/jpeg'
      });

      // Google Lens upload endpoint
      const response = await axios.post(this.uploadEndpoint, form, {
        headers: {
          ...form.getHeaders(),
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://lens.google.com',
          'Referer': 'https://lens.google.com/'
        },
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 200 || status === 303
      });

      // Get redirect URL (contains the search results)
      const redirectUrl = response.headers.location || response.request?.res?.responseUrl;

      if (redirectUrl) {
        return redirectUrl;
      }

      // If no redirect, try parsing the response
      if (response.data && typeof response.data === 'string') {
        const urlMatch = response.data.match(/url=([^&"]+)/);
        if (urlMatch) {
          return decodeURIComponent(urlMatch[1]);
        }
      }

      return null;

    } catch (error) {
      if (error.response?.status === 302 || error.response?.status === 303) {
        return error.response.headers.location;
      }
      console.error('❌ Error uploading to Google Lens:', error.message);
      return null;
    }
  }

  /**
   * Get search results from Google Lens URL
   */
  async getLensResults(lensUrl) {
    try {
      const response = await axios.get(lensUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://lens.google.com/'
        }
      });

      const html = response.data;
      return this.parseLensResults(html);

    } catch (error) {
      console.error('❌ Error fetching Lens results:', error.message);
      return [];
    }
  }

  /**
   * Parse Google Lens HTML results
   * Extracts visual matches, text matches, and related results
   */
  parseLensResults(html) {
    const results = [];

    try {
      const $ = cheerio.load(html);

      // Method 1: Parse visual matches (images found on web)
      $('a[href*="imgurl"]').each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        const title = $link.find('h3').text() || $link.find('.title').text() || 'Visual Match';
        const description = $link.find('.description').text() || $link.find('p').first().text();

        if (href) {
          const url = this.extractUrlFromGoogleLink(href);
          if (url && !results.find(r => r.url === url)) {
            const platform = this.extractPlatformName(url);
            results.push({
              id: `lens-visual-${index + 1}`,
              title: title || `Visual Match on ${platform}`,
              url: url,
              externalUrl: true,
              platform: platform,
              description: description || 'Found via Google Lens visual search',
              type: 'lens-visual-match',
              similarity: 0.92,
              source: 'google-lens'
            });
          }
        }
      });

      // Method 2: Parse "Pages that include matching images" section
      $('div[data-lpage]').each((index, element) => {
        const $div = $(element);
        const $link = $div.find('a').first();
        const href = $link.attr('href');
        const title = $link.text() || $div.find('h3').text();
        const pageUrl = $div.attr('data-lpage') || href;

        if (pageUrl && !results.find(r => r.url === pageUrl)) {
          const platform = this.extractPlatformName(pageUrl);
          results.push({
            id: `lens-page-${index + 1}`,
            title: title || `Page on ${platform}`,
            url: pageUrl,
            externalUrl: true,
            platform: platform,
            description: 'Page contains matching images',
            type: 'lens-page-match',
            similarity: 0.88,
            source: 'google-lens'
          });
        }
      });

      // Method 3: Parse all links that look like result URLs
      $('a[href^="http"], a[href^="https"]').each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href');

        if (this.isResultUrl(href) && !results.find(r => r.url === href)) {
          const title = $link.text() || $link.find('img').attr('alt') || '';
          if (title.trim() && results.length < 50) {
            const platform = this.extractPlatformName(href);
            results.push({
              id: `lens-result-${index + 1}`,
              title: title,
              url: href,
              externalUrl: true,
              platform: platform,
              description: 'Found via Google Lens',
              type: 'lens-match',
              similarity: 0.85,
              source: 'google-lens'
            });
          }
        }
      });

    } catch (error) {
      console.error('❌ Error parsing Lens results:', error.message);
    }

    // Deduplicate and return top results
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex((r) => r.url === result.url)
    );

    return uniqueResults.slice(0, 30);
  }

  /**
   * Check if URL looks like a search result (not Google's own pages)
   */
  isResultUrl(url) {
    if (!url) return false;

    // Exclude Google's own URLs
    const excludePatterns = [
      'google.com/search',
      'google.com/url',
      'google.com/imgres',
      'accounts.google.com',
      'policies.google.com',
      'support.google.com'
    ];

    return !excludePatterns.some(pattern => url.includes(pattern)) &&
           (url.startsWith('http://') || url.startsWith('https://'));
  }

  /**
   * Extract actual URL from Google redirect link
   */
  extractUrlFromGoogleLink(googleUrl) {
    try {
      // Google often wraps URLs like: /url?q=https://example.com&sa=...
      const urlMatch = googleUrl.match(/[?&](?:q|url)=([^&]+)/);
      if (urlMatch) {
        return decodeURIComponent(urlMatch[1]);
      }

      // Or imgurl parameter: imgurl=https://example.com
      const imgUrlMatch = googleUrl.match(/imgurl=([^&]+)/);
      if (imgUrlMatch) {
        return decodeURIComponent(imgUrlMatch[1]);
      }

      return googleUrl;
    } catch (error) {
      return googleUrl;
    }
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
        'amazon.de': 'Amazon',
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
        'wix.com': 'Wix',
        'wordpress.com': 'WordPress',
        'blogspot.com': 'Blogger',
        'medium.com': 'Medium',
        'tumblr.com': 'Tumblr',
        'flickr.com': 'Flickr',
        'imgur.com': 'Imgur',
        'deviantart.com': 'DeviantArt',
        'behance.net': 'Behance',
        'dribbble.com': 'Dribbble',
        'artstation.com': 'ArtStation'
      };

      // Check if hostname matches any known platform
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
}

module.exports = new GoogleLensService();
