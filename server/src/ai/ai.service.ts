import { Injectable } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import { getGeminiApiKey } from '../config/gemini.config';
import { getDoubaoConfig, isDoubaoConfigured } from '../config/doubao.config';
import { generateDoubaoImage } from './doubao.client';
import { generateMahjongTileReference } from '../utils/text-to-image.util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TranslationOption, TranslationStrategy } from '../types/translation.types';

@Injectable()
export class AiService {
  private readonly aiProvider = (process.env.AI_PROVIDER || 'google').toLowerCase();
  private readonly textModel = process.env.GOOGLE_AI_TEXT_MODEL || 'gemini-3.5-flash';
  private readonly imageModel = process.env.GOOGLE_AI_IMAGE_MODEL || 'gemini-3.1-flash-image';
  private readonly imageProviderOrder = (
    process.env.AI_IMAGE_PROVIDER_ORDER ||
    (this.aiProvider === 'hku'
      ? 'hku-gemini,hku-openai,google'
      : 'google,hku-gemini,hku-openai')
  )
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
  private readonly hkuGeminiBaseUrl =
    process.env.HKU_GEMINI_BASE_URL || 'https://api.hku.hk/gemini/student';
  private readonly hkuGeminiApiKey = process.env.HKU_GEMINI_API_KEY || process.env.HKU_API_KEY;
  private readonly hkuGeminiAuthHeader = process.env.HKU_GEMINI_AUTH_HEADER;
  private readonly hkuGeminiAuthScheme = process.env.HKU_GEMINI_AUTH_SCHEME || '';
  private readonly hkuGeminiUseAuthHeader =
    process.env.HKU_GEMINI_USE_AUTH_HEADER === 'true';
  private readonly hkuTextDeploymentId =
    process.env.HKU_GEMINI_TEXT_DEPLOYMENT_ID || this.textModel;
  private readonly hkuImageDeploymentId =
    process.env.HKU_GEMINI_IMAGE_DEPLOYMENT_ID || this.imageModel;
  private readonly hkuImageDeploymentIds = (
    process.env.HKU_GEMINI_IMAGE_DEPLOYMENT_IDS || this.hkuImageDeploymentId
  )
    .split(',')
    .map((deploymentId) => deploymentId.trim())
    .filter(Boolean);
  private readonly hkuOpenAiBaseUrl =
    process.env.HKU_OPENAI_BASE_URL || 'https://api.hku.hk/openai/student';
  private readonly hkuOpenAiApiKey =
    process.env.HKU_OPENAI_API_KEY ||
    process.env.HKU_GEMINI_API_KEY ||
    process.env.HKU_API_KEY;
  private readonly hkuOpenAiApiVersion =
    process.env.HKU_OPENAI_API_VERSION || '2025-04-01-preview';
  private readonly hkuOpenAiImageDeploymentIds = (
    process.env.HKU_OPENAI_IMAGE_DEPLOYMENT_IDS || 'gpt-image-1.5,gpt-image-2'
  )
    .split(',')
    .map((deploymentId) => deploymentId.trim())
    .filter(Boolean);

  private normalizeJsonSchema(schema: unknown): unknown {
    const typeMap: Record<string, string> = {
      [Type.STRING]: 'string',
      [Type.NUMBER]: 'number',
      [Type.INTEGER]: 'integer',
      [Type.BOOLEAN]: 'boolean',
      [Type.ARRAY]: 'array',
      [Type.OBJECT]: 'object',
      [Type.NULL]: 'null',
    };

    if (Array.isArray(schema)) {
      return schema.map((item) => this.normalizeJsonSchema(item));
    }

    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema)) {
      if (key === 'nullable') {
        continue;
      }
      if (key === 'type' && typeof value === 'string') {
        normalized[key] = typeMap[value] || value.toLowerCase();
        continue;
      }
      normalized[key] = this.normalizeJsonSchema(value);
    }

    return normalized;
  }

  private async generateStructuredJson(
    prompt: string,
    schema: unknown,
    systemInstruction: string,
  ): Promise<string> {
    if (this.aiProvider === 'hku') {
      const response = await this.generateHkuContent(this.hkuTextDeploymentId, {
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: this.normalizeJsonSchema(schema),
        },
      });

      const jsonText = response?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('')
        .trim();
      if (!jsonText) {
        throw new Error('HKU Gemini returned an empty response.');
      }

      return jsonText;
    }

    if (!this.ai) {
      throw new Error('Gemini client not initialised. Please configure GEMINI_API_KEY in the environment.');
    }

    const interaction = await this.ai.interactions.create({
      model: this.textModel,
      input: prompt,
      system_instruction: systemInstruction,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: this.normalizeJsonSchema(schema) as Record<string, unknown>,
      },
    });

    const jsonText = interaction.output_text?.trim();
    if (!jsonText) {
      throw new Error('Gemini returned an empty response.');
    }

    return jsonText;
  }

  private async generateImage(
    input: Array<{ type: 'text'; text: string } | { type: 'image'; mime_type: string; data: string }>,
    systemInstruction?: string,
  ): Promise<{ data: string; mimeType: string }> {
    const errors: string[] = [];

    for (const provider of this.imageProviderOrder) {
      try {
        if (provider === 'hku-gemini') {
          for (const deploymentId of this.hkuImageDeploymentIds) {
            try {
              return await this.generateHkuGeminiImage(deploymentId, input, systemInstruction);
            } catch (error) {
              const message = this.formatProviderError(error);
              errors.push(`hku-gemini/${deploymentId}: ${message}`);
              if (!this.shouldTryNextImageProvider(error)) {
                throw error;
              }
              console.warn(`HKU Gemini image provider exhausted or unavailable (${deploymentId}):`, message);
            }
          }
          continue;
        }

        if (provider === 'hku-openai') {
          for (const deploymentId of this.hkuOpenAiImageDeploymentIds) {
            try {
              return await this.generateHkuOpenAiImage(deploymentId, input, systemInstruction);
            } catch (error) {
              const message = this.formatProviderError(error);
              errors.push(`hku-openai/${deploymentId}: ${message}`);
              if (!this.shouldTryNextImageProvider(error)) {
                throw error;
              }
              console.warn(`HKU OpenAI image provider exhausted or unavailable (${deploymentId}):`, message);
            }
          }
          continue;
        }

        if (provider === 'google') {
          return await this.generateGoogleImage(input, systemInstruction);
        }
      } catch (error) {
        const message = this.formatProviderError(error);
        errors.push(`${provider}: ${message}`);
        if (!this.shouldTryNextImageProvider(error)) {
          throw error;
        }
        console.warn(`Image provider exhausted or unavailable (${provider}):`, message);
      }
    }

    throw new Error(`All configured image providers failed. ${errors.join(' | ')}`);
  }

  private async generateHkuGeminiImage(
    deploymentId: string,
    input: Array<{ type: 'text'; text: string } | { type: 'image'; mime_type: string; data: string }>,
    systemInstruction?: string,
  ): Promise<{ data: string; mimeType: string }> {
    const response = await this.generateHkuContent(deploymentId, {
      ...(systemInstruction
        ? {
            system_instruction: {
              parts: [{ text: systemInstruction }],
            },
          }
        : {}),
      contents: [
        {
          role: 'user',
          parts: input.map((part) =>
            part.type === 'text'
              ? { text: part.text }
              : {
                  inlineData: {
                    mimeType: part.mime_type,
                    data: part.data,
                  },
                },
          ),
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
      },
    });

    const imagePart = response?.candidates?.[0]?.content?.parts?.find(
      (part: { inlineData?: { data?: string } }) => part.inlineData?.data,
    );
    const generatedImage = imagePart?.inlineData;
    if (!generatedImage?.data) {
      throw new Error('HKU Gemini failed to generate an image. Please try again later.');
    }

    return {
      data: generatedImage.data,
      mimeType: generatedImage.mimeType || 'image/jpeg',
    };
  }

  private async generateHkuOpenAiImage(
    deploymentId: string,
    input: Array<{ type: 'text'; text: string } | { type: 'image'; mime_type: string; data: string }>,
    systemInstruction?: string,
  ): Promise<{ data: string; mimeType: string }> {
    if (!this.hkuOpenAiApiKey) {
      throw new Error('HKU OpenAI API key not configured. Set HKU_OPENAI_API_KEY or HKU_API_KEY in the environment.');
    }

    if (input.some((part) => part.type === 'image')) {
      throw new Error('HKU OpenAI image generation fallback does not support image inputs for this workflow.');
    }

    const prompt = [
      systemInstruction,
      input
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('\n\n'),
    ]
      .filter(Boolean)
      .join('\n\n');

    const requestUrl = new URL(
      `${this.hkuOpenAiBaseUrl.replace(/\/$/, '')}/${deploymentId}/images/generations`,
    );
    requestUrl.searchParams.set('api-version', this.hkuOpenAiApiVersion);
    requestUrl.searchParams.set('subscription-key', this.hkuOpenAiApiKey);

    const body: Record<string, string | number> = { prompt };
    if (process.env.HKU_OPENAI_IMAGE_SIZE) {
      body.size = process.env.HKU_OPENAI_IMAGE_SIZE;
    }
    if (process.env.HKU_OPENAI_IMAGE_QUALITY) {
      body.quality = process.env.HKU_OPENAI_IMAGE_QUALITY;
    }

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const parsed = await this.parseProviderResponse(response, 'HKU OpenAI');
    const imageData = parsed?.data?.[0]?.b64_json;
    if (!imageData) {
      throw new Error('HKU OpenAI failed to generate an image. Please try again later.');
    }

    return {
      data: imageData,
      mimeType: 'image/png',
    };
  }

  private async generateGoogleImage(
    input: Array<{ type: 'text'; text: string } | { type: 'image'; mime_type: string; data: string }>,
    systemInstruction?: string,
  ): Promise<{ data: string; mimeType: string }> {
    if (!this.ai) {
      throw new Error('The Google AI service is not configured on the server.');
    }

    const interaction = await this.ai.interactions.create({
      model: this.imageModel,
      input,
      system_instruction: systemInstruction,
      response_format: {
        type: 'image',
        mime_type: 'image/jpeg',
      },
    });

    const generatedImage = interaction.output_image;
    if (!generatedImage?.data) {
      throw new Error('AI failed to generate an image. Please try again later.');
    }

    return {
      data: generatedImage.data,
      mimeType: generatedImage.mime_type || 'image/jpeg',
    };
  }

  private async generateHkuContent(deploymentId: string, body: unknown): Promise<any> {
    if (!this.hkuGeminiApiKey) {
      throw new Error('HKU Gemini API key not configured. Set HKU_GEMINI_API_KEY in the environment.');
    }

    const authValue = this.hkuGeminiAuthScheme
      ? `${this.hkuGeminiAuthScheme} ${this.hkuGeminiApiKey}`
      : this.hkuGeminiApiKey;
    const requestUrl = new URL(
      `${this.hkuGeminiBaseUrl.replace(/\/$/, '')}/${deploymentId}:generateContent`,
    );
    requestUrl.searchParams.set('subscription-key', this.hkuGeminiApiKey);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.hkuGeminiUseAuthHeader && this.hkuGeminiAuthHeader) {
      headers[this.hkuGeminiAuthHeader] = authValue;
    }

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return this.parseProviderResponse(response, 'HKU Gemini');
  }

  private async parseProviderResponse(response: Response, providerName: string): Promise<any> {
    const responseText = await response.text();
    let parsed: any;
    try {
      parsed = responseText ? JSON.parse(responseText) : {};
    } catch {
      parsed = responseText;
    }

    if (!response.ok) {
      const activityId =
        typeof parsed === 'object' && parsed?.activityId
          ? ` Activity ID: ${parsed.activityId}.`
          : '';
      const message =
        typeof parsed === 'object' && parsed?.error?.message
          ? parsed.error.message
          : typeof parsed === 'object' && parsed?.message
          ? parsed.message
          : responseText || response.statusText;
      throw new Error(`${providerName} API Error (${response.status}): ${message}.${activityId}`);
    }

    return parsed;
  }

  private formatProviderError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private shouldTryNextImageProvider(error: unknown): boolean {
    const message = this.formatProviderError(error).toLowerCase();
    return (
      message.includes('quota') ||
      message.includes('resource_exhausted') ||
      message.includes('too_many_requests') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('403') ||
      message.includes('404') ||
      message.includes('500') ||
      message.includes('internal server error') ||
      message.includes('resource not found') ||
      message.includes('not configured') ||
      message.includes('api_key_invalid') ||
      message.includes('api key not valid') ||
      message.includes('does not support image inputs')
    );
  }

  async getMahjongTranslationSuggestions(input: string): Promise<TranslationOption[]> {
    const MAX_CHARACTER_LENGTH = 4;
    const MAX_OPTIONS = 3;
    const generateOptionId = (): string =>
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

    const applySpecialCaseSuggestions = (
      input: string,
      options: TranslationOption[],
    ): TranslationOption[] => {
      const result = [...options];
      const lowerInput = input.toLowerCase();
      const lettersOnly = lowerInput.replace(/[^a-z]/g, '');

      const ensureOption = (option: Omit<TranslationOption, 'id'>) => {
        if (!result.some((existing) => existing.chinese === option.chinese)) {
          result.unshift({
            id: generateOptionId(),
            ...option,
          });
        }
      };

      if (/\bhailey\b/.test(lowerInput)) {
        ensureOption({
          chinese: '海莉',
          pronunciation: 'hoi2 lei6',
          explanation: '海 means sea, 莉 means jasmine; together they echo the sound of "Hailey" in Cantonese phonetics.',
          strategy: 'phonetic',
        });
      }

      const mentionsHKU =
        lowerInput.includes('hong kong university') || lettersOnly.includes('hku');
      if (mentionsHKU) {
        ensureOption({
          chinese: '港大',
          pronunciation: 'gong2 daai6',
          explanation:
            '港 means harbour and stands for Hong Kong, 大 means great or university; together this established abbreviation refers to The University of Hong Kong.',
          strategy: 'meaning',
        });
      }

      const unique: TranslationOption[] = [];
      for (const option of result) {
        if (!unique.some((existing) => existing.chinese === option.chinese)) {
          unique.push(option);
        }
      }

      return unique.slice(0, MAX_OPTIONS);
    };

    if (!input || !input.trim()) return [];
    if (this.aiProvider !== 'hku' && !this.ai) {
      throw new Error('Gemini client not initialised. Please configure GEMINI_API_KEY in the environment.');
    }

    const prompt = `User request: "${input.trim()}"

Return between 1 and ${MAX_OPTIONS} Traditional Chinese suggestions tailored for engraving on mahjong tiles. 
Each suggestion must:
- Use at most ${MAX_CHARACTER_LENGTH} characters.
- Include Cantonese Jyutping with tone numbers.
- Provide an English explanation that explicitly states the meaning of EACH character (e.g. '海 means sea, 莉 means jasmine') and, when relevant, how the overall phrase connects to the user's prompt or pronunciation.
- Indicate strategy as "phonetic", "meaning", or "mixed".

Respond strictly as JSON matching the provided schema.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        options: {
          type: Type.ARRAY,
          description: 'Up to 3 translation suggestions.',
          items: {
            type: Type.OBJECT,
            properties: {
              chinese: {
                type: Type.STRING,
                description: `Traditional Chinese characters (max ${MAX_CHARACTER_LENGTH}).`,
              },
              pronunciation: {
                type: Type.STRING,
                description: 'Cantonese Jyutping pronunciation for the whole phrase.',
              },
              explanation: {
                type: Type.STRING,
                description: 'Short English explanation (meaning or pronunciation choice).',
              },
              strategy: {
                type: Type.STRING,
                enum: ['phonetic', 'meaning', 'mixed'],
                description: 'How the translation was derived.',
              },
            },
            required: ['chinese', 'pronunciation', 'explanation', 'strategy'],
          },
        },
      },
      required: ['options'],
    };

    const jsonText = await this.generateStructuredJson(
      prompt,
      responseSchema,
      `You are a Cantonese language expert assisting with mahjong tile engravings. For every option you propose, the explanation must mention the literal meaning of EACH character (e.g. 「海 means sea」) and optionally note pronunciation rationale. Respond ONLY with JSON conforming to the schema. Never return an empty array—offer your best options.`,
    );

    const parsed = JSON.parse(jsonText) as { options?: Array<{ chinese: string; pronunciation: string; explanation: string; strategy: TranslationStrategy }> };
    if (!parsed?.options || !Array.isArray(parsed.options) || !parsed.options.length) {
      throw new Error('Gemini did not return any translation options.');
    }

    const baseOptions = parsed.options
      .filter((option) => option?.chinese && Array.from(option.chinese).length <= MAX_CHARACTER_LENGTH)
      .slice(0, MAX_OPTIONS)
      .map((option) => ({
        id: generateOptionId(),
        chinese: option.chinese,
        pronunciation: option.pronunciation,
        explanation: option.explanation,
        strategy: option.strategy === 'phonetic' || option.strategy === 'meaning' || option.strategy === 'mixed'
          ? option.strategy
          : 'mixed',
      } satisfies TranslationOption));

    if (!baseOptions.length) {
      throw new Error('No valid translation options within character limit.');
    }

    return applySpecialCaseSuggestions(input.trim(), baseOptions);
  }
  private ai?: GoogleGenAI;

  constructor() {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return;
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  private containsChineseCharacters(value: string): boolean {
    return /[\u3400-\u9FFF]/.test(value);
  }

  private isMahjongCraft(craftName: string): boolean {
    const lowerName = craftName.toLowerCase();
    return lowerName.includes('mahjong') || lowerName.includes('麻雀') || lowerName.includes('麻將');
  }

  /**
   * Convert an image URL (either base64 data URL or file path) to base64 string
   */
  private async imageUrlToBase64(imageUrl: string): Promise<string> {
    // If it's already a base64 data URL, extract the base64 part
    if (imageUrl.startsWith('data:')) {
      return imageUrl.split(',')[1];
    }

    // If it's a file path (relative or absolute)
    if (imageUrl.startsWith('/') || imageUrl.startsWith('./')) {
      // Construct absolute path relative to the public directory
      const publicDir = path.join(__dirname, '..', '..', '..', 'public');
      const filePath = path.join(publicDir, imageUrl);
      
      console.log('Reading image file from:', filePath);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Image file not found: ${filePath}`);
      }

      const imageBuffer = fs.readFileSync(filePath);
      console.log('Image file loaded, size:', imageBuffer.length, 'bytes');
      return imageBuffer.toString('base64');
    }

    // If it's an HTTP(S) URL, fetch it
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      console.log('Fetching image from URL:', imageUrl);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from ${imageUrl}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    }

    throw new Error(`Invalid image URL format: ${imageUrl}`);
  }

  /**
   * Detect MIME type from file extension or data URL
   */
  private getMimeType(imageUrl: string): string {
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:(image\/[a-z]+);base64,/);
      return match ? match[1] : 'image/jpeg';
    }

    const ext = path.extname(imageUrl).toLowerCase();
    switch (ext) {
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.webp':
        return 'image/webp';
      case '.gif':
        return 'image/gif';
      default:
        return 'image/jpeg';
    }
  }

  async generateCraftImage(
    craftName: string, 
    userPrompt: string, 
    referenceImageUrl?: string
  ): Promise<{ imageUrl: string }> {
    const aiClient = this.ai;
    try {
      // Check if this is a mahjong craft and if the prompt contains Chinese characters
      const isMahjong = this.isMahjongCraft(craftName);
      const hasChinesePrompt = this.containsChineseCharacters(userPrompt);
      
      let referenceImage: string | null = null;
      let enhancedPrompt = userPrompt;

      // Generate reference image for mahjong with Chinese characters
      if (isMahjong && hasChinesePrompt) {
        // Extract only Chinese characters from the prompt (in case it includes pronunciation/explanation)
        const chineseOnly = userPrompt.match(/[\u3400-\u9FFF]+/g)?.[0] || userPrompt;
        console.log('Generating mahjong tile reference image with Chinese text:', chineseOnly);
        referenceImage = generateMahjongTileReference(chineseOnly);
        
        // DEBUG: Log reference image details
        console.log('Reference image generated:');
        console.log('- Format: PNG (base64 encoded)');
        console.log('- Size:', Math.round(referenceImage.length / 1024), 'KB');
        console.log('- Data URL length:', referenceImage.length, 'characters');
        
        // Enhance the prompt to use the reference image with EXPLICIT instructions
        enhancedPrompt = `A hand-carved traditional Hong Kong mahjong tile with Chinese character(s) engraved vertically on it. 

CRITICAL REQUIREMENTS:
1. Copy the EXACT Chinese characters shown in the reference image - character by character, stroke by stroke
2. The characters must be IDENTICAL to those in the reference image: "${chineseOnly}"
3. Preserve the vertical layout shown in the reference image
4. The tile should be made of ivory-colored material (bone or bamboo)
5. Deep, precise carving showing traditional craftsmanship
6. Characters centered and prominent, carved in traditional style, in red or green color
7. Beautiful lighting that highlights the depth of the engraving

Reference image shows the correct Chinese characters to engrave. DO NOT change, simplify, or substitute any characters.`;
        console.log('Enhanced mahjong prompt for Chinese text:', chineseOnly);
      }

      const fullPrompt = isMahjong && hasChinesePrompt 
        ? enhancedPrompt
        : `A high-quality, artistic image of a modern interpretation of a traditional Hong Kong craft: ${craftName}. The design is inspired by: "${userPrompt}". Focus on intricate details and beautiful lighting.`;

      console.log('=== Backend AI Service - Full Prompt ===');
      console.log('Craft Name:', craftName);
      console.log('User Prompt:', userPrompt);
      console.log('Is Mahjong:', isMahjong);
      console.log('Has Chinese:', hasChinesePrompt);
      console.log('Has Reference Image:', !!referenceImage);
      console.log('Full Prompt Sent to AI:');
      console.log(fullPrompt);
      console.log('========================================');

      const hasChineseInput =
        this.containsChineseCharacters(userPrompt) || this.containsChineseCharacters(craftName);
      const doubaoConfig = hasChineseInput ? getDoubaoConfig() : null;

      if (hasChineseInput && doubaoConfig && isDoubaoConfigured(doubaoConfig)) {
        try {
          const imageUrl = await generateDoubaoImage(fullPrompt, doubaoConfig);
          return { imageUrl };
        } catch (doubaoError) {
          console.error('Error generating image with Doubao:', doubaoError);
          if (!aiClient && !this.imageProviderOrder.some((provider) => provider.startsWith('hku'))) {
            throw doubaoError;
          }
        }
      }

      // Build the prompt array for generateContent API
      const promptParts: Array<{ type: 'text'; text: string } | { type: 'image'; mime_type: string; data: string }> = [
        { type: 'text', text: fullPrompt },
      ];
      
      // Add reference image if available (for mahjong or user-provided)
      if (isMahjong && referenceImage) {
        const base64Data = referenceImage.split(',')[1]; // Extract base64 data
        promptParts.push({
          type: 'image',
          mime_type: 'image/png',
          data: base64Data,
        });
      } else if (referenceImageUrl) {
        // Add user-provided reference image (e.g., cheongsam for pattern draft)
        console.log('Adding user-provided reference image to prompt');
        const refBase64 = await this.imageUrlToBase64(referenceImageUrl);
        const refMimeType = this.getMimeType(referenceImageUrl);
        promptParts.push({
          type: 'image',
          mime_type: refMimeType,
          data: refBase64,
        });
      }

      const generatedImage = await this.generateImage(
        promptParts,
        isMahjong && referenceImage
          ? `You are an expert at generating realistic images of traditional Hong Kong crafts. 
When a reference image is provided showing Chinese characters:
1. You MUST reproduce the EXACT Chinese characters shown in the reference image
2. Copy each character stroke-by-stroke - do NOT simplify, modify, or substitute characters
3. Preserve the vertical layout and positioning shown in the reference
4. The characters are the most critical element - accuracy is paramount
5. Apply the characters to a hand-carved mahjong tile with ivory-colored material

Remember: Character accuracy from the reference image is MORE IMPORTANT than artistic interpretation.`
          : undefined,
      );
      
      return { imageUrl: `data:${generatedImage.mimeType};base64,${generatedImage.data}` };
    } catch (error) {
      console.error('Error generating image with AI provider:', error);
      if (error instanceof Error) {
        throw new Error(error.message.includes('Doubao') ? error.message : `Gemini API Error: ${error.message}`);
      }
      throw new Error('An unknown error occurred during image generation.');
    }
  }

  /**
   * Generate a try-on image by creating a full-body model with the reference face,
   * then combining it with a cheongsam garment.
   */
  async generateTryOnImage(
    craftName: string,
    faceImageUrl: string,
    userPrompt: string,
    existingCheongsamImageUrl?: string
  ): Promise<{ imageUrl: string }> {
    // Helper to save base64 image to debug dir
    const saveDebugImage = (base64: string, filename: string) => {
      if (process.env.NODE_ENV !== 'development') return;
      try {
        const debugDir = path.join(__dirname, '..', '..', 'debug');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        const filePath = path.join(debugDir, filename);
        fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
        console.log(`Saved debug image: ${filePath}`);
      } catch (err) {
        console.error('Failed to save debug image', filename, err);
      }
    };
    try {
      console.log('=== Try-On Image Generation ===');
      console.log('Craft Name:', craftName);
      console.log('User Prompt:', userPrompt);
      console.log('Face Image URL:', faceImageUrl);
      console.log('Existing Cheongsam Image:', existingCheongsamImageUrl ? 'Yes' : 'No');

      // Step 1: Generate a full-body model with the reference face
      const faceBase64 = await this.imageUrlToBase64(faceImageUrl);
      const faceMimeType = this.getMimeType(faceImageUrl);
      console.log('Face image converted to base64, length:', faceBase64.length, 'MIME type:', faceMimeType);
          saveDebugImage(faceBase64, 'step1_face_input.jpg');

      const step1Prompt: Array<{ type: 'text'; text: string } | { type: 'image'; mime_type: string; data: string }> = [
        { 
          type: 'text',
          text: `Using the provided image of a person's face, generate a professional full-body portrait of this exact person. CRITICAL: Preserve the person's facial features EXACTLY as shown in the reference image - including face shape, eyes, nose, mouth, skin tone, and all unique characteristics. 

The person should be:

Remember: The face must be IDENTICAL to the reference image provided.` 
        },
        {
          type: 'image',
          mime_type: faceMimeType,
          data: faceBase64,
        },
      ];

      console.log('Step 1: Generating full-body model with reference face...');
      const step1Image = await this.generateImage(step1Prompt);
      const fullBodyImageBase64 = step1Image.data;
      console.log('Step 1: Full-body image generated successfully');
      saveDebugImage(fullBodyImageBase64, 'step1_fullbody.jpg');

      // Step 2: Get or generate cheongsam garment image
      let cheongsamImageBase64: string | null = null;
      
      if (existingCheongsamImageUrl) {
        // Use existing cheongsam image from concept mode
        console.log('Step 2: Using existing cheongsam image from concept mode');
        cheongsamImageBase64 = await this.imageUrlToBase64(existingCheongsamImageUrl);
            saveDebugImage(cheongsamImageBase64, 'step2_cheongsam_input.jpg');
        console.log('Step 2: Existing cheongsam image loaded successfully');
      } else {
        // Generate new cheongsam garment image
        console.log('Step 2: Generating cheongsam garment...');
        const cheongsamPrompt = `Create a professional product photo of an elegant ${craftName}. The cheongsam should feature:
${userPrompt ? `\nAdditional design notes: ${userPrompt}` : ''}`;

        const step2Image = await this.generateImage([{ type: 'text', text: cheongsamPrompt }]);
        cheongsamImageBase64 = step2Image.data;
        saveDebugImage(cheongsamImageBase64, 'step2_cheongsam_generated.jpg');
        console.log('Step 2: Cheongsam garment generated successfully');
      }

      if (!cheongsamImageBase64) {
        throw new Error('Failed to generate cheongsam garment in step 2');
      }

      // Step 3: Combine the full-body model with the cheongsam
      console.log('Step 3: Combining model with cheongsam...');
      const step3Prompt: Array<{ type: 'text'; text: string } | { type: 'image'; mime_type: string; data: string }> = [
        {
          type: 'text',
          text: `You are given two images:
1. A full-body photo of a person (the model)
2. A cheongsam garment

Your task: Create a professional fashion e-commerce photo showing the person wearing the cheongsam. Generate a realistic, full-body shot with these requirements:

CRITICAL FACIAL PRESERVATION:

OUTFIT REQUIREMENTS:

OVERALL QUALITY:

Do NOT just return the person's photo - you must show them WEARING the cheongsam garment with matching footwear.`
        },
        {
          type: 'image',
          mime_type: step1Image.mimeType,
          data: fullBodyImageBase64,
        },
        {
          type: 'image',
          mime_type: 'image/jpeg',
          data: cheongsamImageBase64,
        },
      ];

      const step3Image = await this.generateImage(step3Prompt);
      const finalImageBase64 = step3Image.data;
      saveDebugImage(finalImageBase64, 'step3_final_tryon.jpg');
      console.log('Step 3: Try-on image generated successfully');
      console.log('Final image preview (first 100 chars):', finalImageBase64.substring(0, 100));
      console.log('================================');
      return { imageUrl: `data:${step3Image.mimeType};base64,${finalImageBase64}` };
    } catch (error) {
      console.error('Error in try-on image generation:', error);
      if (error instanceof Error) {
        throw new Error(`Try-on generation failed: ${error.message}`);
      }
      throw new Error('An unknown error occurred during try-on image generation.');
    }
  }

  async generateTextLabLayouts(craftName: string, userInput: string, mode: string) {
    try {
      const apiKey = getGeminiApiKey();
      if (this.aiProvider !== 'hku' && !apiKey) {
        throw new Error('Gemini API key not configured');
      }

      // Glyph library matching frontend
      const GLYPH_LIBRARY = [
        { name: '手', glyph: 'shou' },
        { name: '田', glyph: 'tian' },
        { name: '水', glyph: 'shui' },
        { name: '口', glyph: 'kou' },
        { name: '廿', glyph: 'nian' },
        { name: '卜', glyph: 'bu' },
        { name: '山', glyph: 'shan' },
        { name: '戈', glyph: 'ge' },
        { name: '人', glyph: 'ren' },
        { name: '心', glyph: 'xin' },
        { name: '日', glyph: 'ri' },
        { name: '尸', glyph: 'shi' },
        { name: '木', glyph: 'mu' },
        { name: '火', glyph: 'huo' },
        { name: '土', glyph: 'tu' },
        { name: '竹', glyph: 'zhu' },
        { name: '大', glyph: 'da' },
        { name: '中', glyph: 'zhong' },
        { name: '金', glyph: 'jin' },
        { name: '女', glyph: 'nu' },
        { name: '月', glyph: 'yue' },
        { name: '弓', glyph: 'gong' },
        { name: '一', glyph: 'heng' },
        { name: '丨', glyph: 'shu' },
        { name: '丿', glyph: 'pie' },
        { name: '㇏', glyph: 'na' },
        { name: '㇔', glyph: 'dian' },
        { name: '𠃋', glyph: 'ti' },
      ];

      const glyphNames = GLYPH_LIBRARY.map(g => g.glyph);

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          layouts: {
            type: Type.ARRAY,
            description: "An array of 3 distinct layout proposals for the seal.",
            items: {
              type: Type.OBJECT,
              properties: {
                description: {
                  type: Type.STRING,
                  description: "A brief, artistic description of the visual style.",
                },
                elements: {
                  type: Type.ARRAY,
                  description: "The array of graphical elements that compose the design.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      glyph: {
                        type: Type.STRING,
                        enum: glyphNames,
                        description: "One of the allowed glyph identifiers.",
                      },
                      x: {
                        type: Type.NUMBER,
                        description: "Horizontal position (0 to 400).",
                      },
                      y: {
                        type: Type.NUMBER,
                        description: "Vertical position (0 to 400).",
                      },
                      scale: {
                        type: Type.NUMBER,
                        description: "Size multiplier (0.5 to 2.0).",
                      },
                      rotation: {
                        type: Type.NUMBER,
                        description: "Rotation in degrees (-180 to 180).",
                      },
                      fontWeight: {
                        type: Type.NUMBER,
                        description: "Stroke thickness (100 to 900).",
                      },
                      isMirror: {
                        type: Type.BOOLEAN,
                        description: "Whether to horizontally flip the glyph.",
                        nullable: true,
                      },
                      isOutline: {
                        type: Type.BOOLEAN,
                        description: "Whether to render as outline only.",
                        nullable: true,
                      },
                    },
                    required: ["glyph", "x", "y", "scale", "rotation", "fontWeight"],
                  },
                },
              },
              required: ["description", "elements"],
            },
          },
        },
        required: ["layouts"],
      };

      const systemInstruction = `You are a seal-carving AI that generates creative seal/stamp layouts using ancient Chinese radicals and strokes.`;

      let userPrompt = '';
      if (mode === 'concept') {
        userPrompt = `Create 3 distinct artistic seal layouts that visually represent: "${userInput}"`;
      } else {
        userPrompt = `Create 3 distinct artistic seal layouts for the Chinese text: "${userInput}"`;
      }

      userPrompt += `\n\nUse radicals/strokes from: ${GLYPH_LIBRARY.map(g => g.name).join(', ')}`;
      userPrompt += `\nCanvas: 400x400px. Position elements creatively. Use 5-15 glyphs per layout.`;

      console.log('=== AI Text Lab Generation Prompt ===');
      console.log('Craft:', craftName);
      console.log('Mode:', mode);
      console.log('User Input:', userInput);
      console.log('=====================================');

      const text = await this.generateStructuredJson(
        userPrompt,
        responseSchema,
        systemInstruction,
      );
      const jsonText = text.replace(/```json\n?|```\n?/g, '').trim();
      const responseJson = JSON.parse(jsonText);

      console.log('[Text Lab] Generated layouts:', responseJson?.layouts?.length || 0);

      return responseJson;
    } catch (error) {
      console.error('Error generating text lab layouts:', error);
      throw new Error(`Text lab generation failed: ${error.message}`);
    }
  }
}
