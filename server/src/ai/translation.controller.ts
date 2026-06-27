import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

@Controller('api/translation')
export class TranslationController {
  constructor(private readonly aiService: AiService) {}

  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  async getTranslationSuggestions(@Body() body: { input: string }) {
    // This method will call a new service method to get translation suggestions
    return this.aiService.getMahjongTranslationSuggestions(body.input);
  }
}
