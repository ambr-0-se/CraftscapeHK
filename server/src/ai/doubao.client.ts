import { DoubaoConfig } from '../config/doubao.config';

interface DoubaoImageChunk {
  b64_json?: string;
  base64_data?: string;
  image_base64?: string;
  image_bytes?: string;
  mime_type?: string;
}

interface DoubaoResponse {
  data?: DoubaoImageChunk[];
  output?: { b64_json?: string; mime_type?: string }[];
  result?: { images?: DoubaoImageChunk[] };
}

const resolveImagePayload = (payload?: DoubaoImageChunk): { base64?: string; mime?: string } => {
  if (!payload) {
    return {};
  }
  const base64 =
    payload.b64_json ||
    payload.image_bytes ||
    payload.image_base64 ||
    payload.base64_data;

  return {
    base64,
    mime: payload.mime_type,
  };
};

export const generateDoubaoImage = async (
  fullPrompt: string,
  config: DoubaoConfig,
): Promise<string> => {
  const { apiKey, endpoint, model, responseMimeType } = config;

  if (!apiKey) {
    throw new Error('Doubao API key is not configured.');
  }

  if (!endpoint) {
    throw new Error('Doubao image endpoint is not configured.');
  }

  if (!model) {
    throw new Error('Doubao image model is not configured.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      n: 1,
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Doubao API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const body = (await response.json()) as DoubaoResponse;

  const fromData = resolveImagePayload(body.data?.[0]);
  const fromOutput = resolveImagePayload(body.output?.[0]);
  const fromResult = resolveImagePayload(body.result?.images?.[0]);

  const base64 = fromData.base64 || fromOutput.base64 || fromResult.base64;
  const mime = fromData.mime || fromOutput.mime || fromResult.mime || responseMimeType || 'image/jpeg';

  if (!base64) {
    throw new Error('Doubao API returned an empty image payload.');
  }

  return `data:${mime};base64,${base64}`;
};
