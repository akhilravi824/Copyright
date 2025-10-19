const { getAiConfiguration, isAiEnabled } = require('../config/aiClient');

const mapRiskLevel = (value) => {
  if (!value) {
    return 'medium';
  }

  const normalized = String(value).toLowerCase();

  if (['critical', 'very_high', 'very-high'].includes(normalized)) {
    return 'very_high';
  }

  if (['severe', 'extreme'].includes(normalized)) {
    return 'high';
  }

  if (['high', 'elevated'].includes(normalized)) {
    return 'high';
  }

  if (['moderate', 'medium'].includes(normalized)) {
    return 'medium';
  }

  if (['guarded', 'low'].includes(normalized)) {
    return 'low';
  }

  return 'medium';
};

const callOpenAi = async ({ body, headers, baseUrl, requestTimeoutMs }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${errorMessage}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const buildPrompt = ({ matches, fingerprint, mimeType, fileName }) => {
  const matchSummaries = matches.slice(0, 5).map((match) => ({
    source: match.source,
    domain: match.domain,
    confidence: match.confidence,
    firstSeen: match.firstSeen,
    lastSeen: match.lastSeen,
    contentType: match.contentType,
    actions: match.actions
  }));

  return [
    {
      role: 'system',
      content:
        'You are a copyright enforcement analyst. Summarize reverse image search findings and recommend next steps. Respond using concise business language.'
    },
    {
      role: 'user',
      content: `Reference file: ${fileName || 'uploaded-image'} (${mimeType || 'unknown mime'})\nFingerprint: ${
        fingerprint.signature
      } (SHA-256, ${fingerprint.byteLength} bytes).\nMatches: ${JSON.stringify(matchSummaries)}.\nGenerate a JSON object with fields: summary (string), risk_level (one of very_high, high, medium, low), confidence_statement (string), recommended_actions (array of 2-4 imperative strings).`
    }
  ];
};

const parseAiResponse = (payload) => {
  const content = payload?.choices?.[0]?.message?.content;

  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content);

    const recommendedActions = Array.isArray(parsed.recommended_actions)
      ? parsed.recommended_actions.filter(Boolean)
      : [];

    return {
      summary: parsed.summary,
      riskLevel: mapRiskLevel(parsed.risk_level),
      confidenceStatement: parsed.confidence_statement,
      recommendedActions
    };
  } catch (error) {
    return null;
  }
};

const generateAiInsights = async ({ matches, fingerprint, mimeType, fileName }) => {
  if (!isAiEnabled()) {
    return null;
  }

  if (typeof fetch !== 'function') {
    console.warn('AI insights disabled: fetch API is not available in this runtime.');
    return null;
  }

  const configuration = getAiConfiguration();

  if (!configuration) {
    return null;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${configuration.apiKey}`
  };

  if (configuration.organization) {
    headers['OpenAI-Organization'] = configuration.organization;
  }

  if (configuration.project) {
    headers['OpenAI-Project'] = configuration.project;
  }

  const body = {
    model: configuration.model,
    temperature: 0.2,
    messages: buildPrompt({ matches, fingerprint, mimeType, fileName }),
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'ReverseImageInsight',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            summary: { type: 'string' },
            risk_level: { type: 'string' },
            confidence_statement: { type: 'string' },
            recommended_actions: {
              type: 'array',
              minItems: 1,
              maxItems: 4,
              items: { type: 'string' }
            }
          },
          required: ['summary', 'risk_level', 'recommended_actions']
        }
      }
    }
  };

  try {
    const payload = await callOpenAi({
      baseUrl: configuration.baseUrl,
      headers,
      body,
      requestTimeoutMs: configuration.requestTimeoutMs
    });

    return parseAiResponse(payload);
  } catch (error) {
    console.warn('Reverse image AI insight generation failed:', error.message);
    return null;
  }
};

module.exports = {
  generateAiInsights
};
