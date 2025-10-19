const axios = require('axios');
const crypto = require('crypto');
const { generateAiInsights } = require('./aiReverseImageInsights');

class ReverseImageSearchError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ReverseImageSearchError';
    this.statusCode = statusCode;
  }
}

const SOURCE_MARKETS = [
  {
    name: 'Global Marketplace Watch',
    domain: 'marketwatch.example.com',
    type: 'Marketplace'
  },
  {
    name: 'Social Pulse Monitor',
    domain: 'socialpulse.example.com',
    type: 'Social Media'
  },
  {
    name: 'Streaming Radar',
    domain: 'streamradar.example.com',
    type: 'Streaming Platform'
  },
  {
    name: 'Auction Shield',
    domain: 'auctionshield.example.com',
    type: 'Auction Site'
  },
  {
    name: 'Content Tracker Pro',
    domain: 'contenttracker.example.com',
    type: 'Content Platform'
  }
];

const RECOMMENDED_ACTIONS = [
  'Issue takedown notice',
  'Escalate to legal review',
  'Flag for continued monitoring',
  'Contact platform compliance team'
];

const KEY_FINDINGS = [
  'Multiple listings detected across high-risk marketplaces',
  'High-confidence match with potential unauthorized distribution',
  'Repeat offender detected with prior enforcement history',
  'Emerging trend identified that requires proactive enforcement'
];

const normalizeBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new ReverseImageSearchError('Invalid file buffer provided', 400);
  }
  return buffer;
};

const fetchImageFromUrl = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    throw new ReverseImageSearchError(
      'Unable to download image from provided URL. Ensure the link is publicly accessible.',
      400
    );
  }
};

const generateMatchesFromHash = (hash, mimeType) => {
  const matches = [];
  const baseConfidence = parseInt(hash.slice(0, 2), 16) / 255;

  for (let i = 0; i < 3; i += 1) {
    const source = SOURCE_MARKETS[(parseInt(hash.slice(2 + i * 2, 4 + i * 2), 16) + i) % SOURCE_MARKETS.length];
    const confidence = Math.min(0.65 + baseConfidence * 0.3 + i * 0.05, 0.98);
    const confidenceScore = Math.round(confidence * 100);

    matches.push({
      id: `${hash.slice(i * 8, i * 8 + 8)}-${i}`,
      source: source.name,
      domain: source.domain,
      contentType: source.type,
      confidence: confidenceScore,
      lastSeen: new Date(Date.now() - i * 36 * 60 * 60 * 1000).toISOString(),
      firstSeen: new Date(Date.now() - (i + 2) * 72 * 60 * 60 * 1000).toISOString(),
      listingUrl: `https://${source.domain}/listing/${hash.slice(8 + i * 5, 16 + i * 5)}`,
      previewUrl: `https://images.examplecdn.com/${hash.slice(i * 8, i * 8 + 10)}.${mimeType?.split('/')[1] || 'jpg'}`,
      snippet: 'Detected content closely matches reference asset with high visual similarity.',
      actions: [
        RECOMMENDED_ACTIONS[(parseInt(hash.slice(4 + i * 2, 6 + i * 2), 16) + i) % RECOMMENDED_ACTIONS.length],
        'Assign to enforcement team'
      ]
    });
  }

  return matches;
};

const buildAnalysisSummary = (matches, hash, byteLength) => {
  const highestConfidence = Math.max(...matches.map((match) => match.confidence));
  const findingsIndex = parseInt(hash.slice(-2), 16) % KEY_FINDINGS.length;

  return {
    fingerprint: {
      hash,
      byteLength,
      signature: hash.slice(0, 16)
    },
    summary: KEY_FINDINGS[findingsIndex],
    matchStatistics: {
      totalMatches: matches.length,
      highestConfidence,
      averageConfidence: Math.round(
        matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length
      ),
      riskLevel:
        highestConfidence >= 90
          ? 'very_high'
          : highestConfidence >= 80
            ? 'high'
            : highestConfidence >= 60
              ? 'medium'
              : 'low'
    }
  };
};

const performSearch = async ({
  fileBuffer,
  mimeType,
  fileName,
  imageUrl,
  includeMetadata = true,
  useAiInsights = false
}) => {
  const buffer = fileBuffer
    ? normalizeBuffer(fileBuffer)
    : await fetchImageFromUrl(imageUrl);

  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const matches = generateMatchesFromHash(hash, mimeType);

  const response = {
    success: true,
    generatedAt: new Date().toISOString(),
    matches
  };

  if (includeMetadata) {
    const metadata = buildAnalysisSummary(matches, hash, buffer.byteLength);
    metadata.mimeType = mimeType || 'application/octet-stream';
    metadata.fileName = fileName || imageUrl || 'uploaded-image';
    metadata.recommendedActions = matches[0]?.actions || [];

    if (useAiInsights) {
      const aiInsights = await generateAiInsights({
        matches,
        fingerprint: metadata.fingerprint,
        mimeType: metadata.mimeType,
        fileName: metadata.fileName
      });

      if (aiInsights) {
        metadata.aiInsights = {
          ...aiInsights,
          provider: 'openai',
          generatedAt: new Date().toISOString()
        };

        if (aiInsights.summary) {
          metadata.summary = aiInsights.summary;
        }

        if (aiInsights.recommendedActions?.length) {
          metadata.recommendedActions = aiInsights.recommendedActions;
        }

        if (aiInsights.riskLevel) {
          metadata.matchStatistics.riskLevel = aiInsights.riskLevel;
        }
      }
    }

    response.metadata = metadata;
  }

  return response;
};

module.exports = {
  performSearch,
  ReverseImageSearchError
};
