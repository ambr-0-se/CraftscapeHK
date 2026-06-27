import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-image')
  @HttpCode(HttpStatus.OK)
  async generateImage(@Body() body: { 
    craftName: string; 
    userPrompt: string;
    referenceImageUrl?: string;
  }) {
    const { craftName, userPrompt, referenceImageUrl } = body;
    return this.aiService.generateCraftImage(craftName, userPrompt, referenceImageUrl);
  }

  @Post('generate-tryon')
  @HttpCode(HttpStatus.OK)
  async generateTryOn(@Body() body: { 
    craftName: string; 
    faceImageUrl: string; 
    userPrompt: string;
    existingCheongsamImageUrl?: string;
  }) {
    const { craftName, faceImageUrl, userPrompt, existingCheongsamImageUrl } = body;
    return this.aiService.generateTryOnImage(craftName, faceImageUrl, userPrompt, existingCheongsamImageUrl);
  }

  @Post('generate-text-lab-layouts')
  @HttpCode(HttpStatus.OK)
  async generateTextLabLayouts(@Body() body: { 
    craftName: string; 
    userInput: string;
    mode: string;
  }) {
    const { craftName, userInput, mode } = body;
    return this.aiService.generateTextLabLayouts(craftName, userInput, mode);
  }
}