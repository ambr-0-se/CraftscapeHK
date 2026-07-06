import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CoCreationService } from './co-creation.service';

@Controller('api/co-creation')
export class CoCreationController {
  constructor(private readonly coCreationService: CoCreationService) {}

  @Post('concepts/generate')
  generateConcept(
    @Body()
    body: {
      craftId: string | number;
      craftName: { zh: string; en: string };
      userPrompt: string;
      customerId?: string;
      referenceImageUrl?: string;
    },
  ) {
    return this.coCreationService.generateConcept(body);
  }

  @Get('concepts')
  findConcepts(@Query('customerId') customerId?: string) {
    return this.coCreationService.findConcepts(customerId);
  }

  @Post('concepts')
  createConcept(
    @Body()
    body: {
      craftId: string | number;
      craftName: { zh: string; en: string };
      prompt: string;
      imageUrl: string;
      customerId?: string;
      referenceImageUrls?: string[];
    },
  ) {
    return this.coCreationService.createConcept(body);
  }

  @Post('requests')
  createRequest(
    @Body()
    body: {
      aiCreationId?: string;
      customerId?: string;
      artisanId?: string;
      craftId: string | number;
      prompt: string;
      referenceImageUrls: string[];
      customerName?: string;
      customerEmail?: string;
      customerMessage?: string;
    },
  ) {
    return this.coCreationService.createRequest(body);
  }

  @Get('requests')
  findRequests(
    @Query('customerId') customerId?: string,
    @Query('artisanId') artisanId?: string,
  ) {
    return this.coCreationService.findRequests({ customerId, artisanId });
  }

  @Patch('requests/:id/artisan-decision')
  applyArtisanDecision(
    @Param('id') id: string,
    @Body()
    body: {
      decision: 'approve' | 'reject' | 'request_changes';
      artisanId?: string;
      artisanNote?: string;
      quoteAmountCents?: number;
      depositAmountCents?: number;
    },
  ) {
    return this.coCreationService.applyArtisanDecision(id, body);
  }
}
