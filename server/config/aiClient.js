const isTruthy = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  return false;
};

const isAiEnabled = () =>
  isTruthy(process.env.ENABLE_AI_REVERSE_IMAGE_SUMMARY) && Boolean(process.env.OPENAI_API_KEY);

const getAiConfiguration = () => {
  if (!isAiEnabled()) {
    return null;
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  return {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl,
    organization: process.env.OPENAI_ORGANIZATION,
    project: process.env.OPENAI_PROJECT,
    model:
      process.env.OPENAI_REVERSE_IMAGE_MODEL ||
      process.env.OPENAI_MODEL ||
      'gpt-4o-mini',
    requestTimeoutMs: Number.parseInt(process.env.OPENAI_REQUEST_TIMEOUT_MS, 10) || 15000
  };
};

module.exports = {
  getAiConfiguration,
  isAiEnabled
};
