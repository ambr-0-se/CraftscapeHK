import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import { Product } from '../entities/product.entity';
import { getGeminiApiKey } from '../config/gemini.config';
import { getDoubaoConfig, isDoubaoConfigured } from '../config/doubao.config';
import { generateDoubaoImage } from '../ai/doubao.client';
import { generateMahjongTileReference } from '../utils/text-to-image.util';

@Injectable()
export class ProductsService {
  private ai?: GoogleGenAI;

  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return;
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async findAll(): Promise<Product[]> {
    return this.productsRepository.find();
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  private containsChineseCharacters(value: string): boolean {
    return /[\u3400-\u9FFF]/.test(value);
  }

  private isMahjongCraft(craftName: string): boolean {
    const lowerName = craftName.toLowerCase();
    return lowerName.includes('mahjong') || lowerName.includes('麻雀') || lowerName.includes('麻將');
  }

  async generateCraftImage(craftName: string, userPrompt: string): Promise<{ imageUrl: string }> {
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
        
        // Enhance the prompt with explicit instructions
        enhancedPrompt = `A hand-carved traditional Hong Kong mahjong tile with Chinese character(s) engraved vertically on it. 

CRITICAL REQUIREMENTS:
1. Copy the EXACT Chinese characters shown in the reference image - character by character, stroke by stroke
2. The characters must be IDENTICAL to those in the reference image: "${chineseOnly}"
3. Preserve the vertical layout shown in the reference image
4. The tile should be made of ivory-colored material (bone or bamboo)
5. Deep, precise carving showing traditional craftsmanship
6. Characters centered and prominent, carved in traditional style
7. Beautiful lighting that highlights the depth of the engraving

Reference image shows the correct Chinese characters to engrave. DO NOT change, simplify, or substitute any characters.`;
        console.log('Enhanced mahjong prompt for Chinese text:', chineseOnly);
      }

      const fullPrompt = isMahjong && hasChinesePrompt 
        ? enhancedPrompt
        : `A high-quality, artistic image of a modern interpretation of a traditional Hong Kong craft: ${craftName}. The design is inspired by: "${userPrompt}". Focus on intricate details and beautiful lighting.`;

      const hasChineseInput =
        this.containsChineseCharacters(userPrompt) || this.containsChineseCharacters(craftName);
      const doubaoConfig = hasChineseInput ? getDoubaoConfig() : null;

      if (hasChineseInput && doubaoConfig && isDoubaoConfigured(doubaoConfig)) {
        try {
          const imageUrl = await generateDoubaoImage(fullPrompt, doubaoConfig);
          return { imageUrl };
        } catch (doubaoError) {
          console.error('Error generating image with Doubao:', doubaoError);
          if (!aiClient) {
            throw doubaoError;
          }
        }
      }

      if (!aiClient) {
        throw new Error("The AI service is not configured on the server.");
      }

      // Build the prompt array for generateContent API
      const promptParts: any[] = [{ text: fullPrompt }];
      
      // Add reference image if available for mahjong
      if (isMahjong && referenceImage) {
        const base64Data = referenceImage.split(',')[1]; // Extract base64 data
        promptParts.push({
          inlineData: {
            mimeType: 'image/png',
            data: base64Data,
          },
        });
      }

      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: promptParts,
        config: isMahjong && referenceImage ? {
          systemInstruction: `You are an expert at generating realistic images of traditional Hong Kong crafts. 
When a reference image is provided showing Chinese characters:
1. You MUST reproduce the EXACT Chinese characters shown in the reference image
2. Copy each character stroke-by-stroke - do NOT simplify, modify, or substitute characters
3. Preserve the vertical layout and positioning shown in the reference
4. The characters are the most critical element - accuracy is paramount
5. Apply the characters to a hand-carved mahjong tile with ivory-colored material

Remember: Character accuracy from the reference image is MORE IMPORTANT than artistic interpretation.`
        } : undefined,
      });

      // Extract the generated image from the response
      if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64ImageBytes = part.inlineData.data;
            return { imageUrl: `data:image/jpeg;base64,${base64ImageBytes}` };
          }
        }
      } else {
        throw new Error('AI failed to generate an image. Please try again later.');
      }
    } catch (error) {
      console.error('Error generating image with AI provider:', error);
      if (error instanceof Error) {
        throw new Error(error.message.includes('Doubao') ? error.message : `Gemini API Error: ${error.message}`);
      }
      throw new Error('An unknown error occurred during image generation.');
    }
  }
}
