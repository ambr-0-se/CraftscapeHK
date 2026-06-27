export interface DoubaoConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  responseMimeType?: string;
}

const DEFAULT_MODEL = 'doubao-image-lite-v1';
const DEFAULT_MIME_TYPE = 'image/jpeg';

export const getDoubaoConfig = (): DoubaoConfig => ({
  apiKey: process.env.DOUBAO_API_KEY,
  endpoint: process.env.DOUBAO_IMAGE_ENDPOINT || process.env.DOUBAO_API_URL,
  model: process.env.DOUBAO_IMAGE_MODEL || DEFAULT_MODEL,
  responseMimeType: process.env.DOUBAO_IMAGE_MIME_TYPE || DEFAULT_MIME_TYPE,
});

export const isDoubaoConfigured = (
  config: DoubaoConfig,
): config is DoubaoConfig & { apiKey: string; endpoint: string; model: string } =>
  Boolean(config.apiKey && config.endpoint && config.model);
