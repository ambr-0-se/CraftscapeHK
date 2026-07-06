import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ARTISAN_APPROVAL_STATE_TRANSITIONS,
  ArtisanApprovalState,
  CO_CREATION_REQUEST_STATUS_TRANSITIONS,
  CoCreationRequestStatus,
  type AiCreationContract,
  type CoCreationRequestContract,
  canTransition,
} from '@craftscape/contracts';
import { randomUUID } from 'node:crypto';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { AiCreation } from '../entities/ai-creation.entity';
import { Artisan } from '../entities/artisan.entity';
import { CoCreationRequest } from '../entities/co-creation-request.entity';

const DEMO_CUSTOMER_ID = 'customer-demo';

@Injectable()
export class CoCreationService {
  constructor(
    @InjectRepository(AiCreation)
    private readonly aiCreationsRepository: Repository<AiCreation>,
    @InjectRepository(Artisan)
    private readonly artisansRepository: Repository<Artisan>,
    @InjectRepository(CoCreationRequest)
    private readonly requestsRepository: Repository<CoCreationRequest>,
    private readonly aiService: AiService,
  ) {}

  async generateConcept(input: {
    craftId: string | number;
    craftName: { zh: string; en: string };
    userPrompt: string;
    customerId?: string;
    referenceImageUrl?: string;
  }): Promise<AiCreationContract> {
    const prompt = input.userPrompt?.trim();
    if (!prompt) {
      throw new BadRequestException('A prompt is required to generate a co-creation concept.');
    }

    const image = await this.aiService.generateCraftImage(
      input.craftName.en || input.craftName.zh,
      prompt,
      input.referenceImageUrl,
    );
    const now = new Date().toISOString();
    const creation = this.aiCreationsRepository.create({
      id: `creation_${randomUUID()}`,
      customerId: input.customerId || DEMO_CUSTOMER_ID,
      craftId: String(input.craftId),
      craftName: input.craftName,
      prompt,
      imageUrl: image.imageUrl,
      referenceImageUrls: [image.imageUrl],
      createdAt: now,
    });

    return this.toAiCreationContract(await this.aiCreationsRepository.save(creation));
  }

  async findConcepts(customerId = DEMO_CUSTOMER_ID): Promise<AiCreationContract[]> {
    const concepts = await this.aiCreationsRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
    return concepts.map((concept) => this.toAiCreationContract(concept));
  }

  async createConcept(input: {
    craftId: string | number;
    craftName: { zh: string; en: string };
    prompt: string;
    imageUrl: string;
    customerId?: string;
    referenceImageUrls?: string[];
  }): Promise<AiCreationContract> {
    const prompt = input.prompt?.trim();
    if (!prompt) {
      throw new BadRequestException('A prompt is required to save a co-creation concept.');
    }
    if (!input.imageUrl) {
      throw new BadRequestException('An image reference is required to save a co-creation concept.');
    }

    const now = new Date().toISOString();
    const creation = this.aiCreationsRepository.create({
      id: `creation_${randomUUID()}`,
      customerId: input.customerId || DEMO_CUSTOMER_ID,
      craftId: String(input.craftId),
      craftName: input.craftName,
      prompt,
      imageUrl: input.imageUrl,
      referenceImageUrls: input.referenceImageUrls?.length
        ? input.referenceImageUrls
        : [input.imageUrl],
      createdAt: now,
    });

    return this.toAiCreationContract(await this.aiCreationsRepository.save(creation));
  }

  async createRequest(input: {
    aiCreationId?: string;
    customerId?: string;
    artisanId?: string;
    craftId: string | number;
    prompt: string;
    referenceImageUrls: string[];
    customerName?: string;
    customerEmail?: string;
    customerMessage?: string;
  }): Promise<CoCreationRequestContract> {
    const prompt = input.prompt?.trim();
    if (!prompt) {
      throw new BadRequestException('A prompt is required to submit a co-creation request.');
    }

    const artisan = await this.findArtisanForRequest(input.craftId, input.artisanId);
    const now = new Date().toISOString();
    const request = this.requestsRepository.create({
      id: `request_${randomUUID()}`,
      customerId: input.customerId || DEMO_CUSTOMER_ID,
      artisanId: input.artisanId || this.toArtisanUserId(artisan),
      artisanProfileId: artisan?.id,
      craftId: String(input.craftId),
      aiCreationId: input.aiCreationId,
      prompt,
      referenceImageUrls: input.referenceImageUrls?.length ? input.referenceImageUrls : [],
      status: CoCreationRequestStatus.PendingArtisanReview,
      approvalState: ArtisanApprovalState.Pending,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerMessage: input.customerMessage,
      createdAt: now,
      updatedAt: now,
    });

    return this.toRequestContract(await this.requestsRepository.save(request));
  }

  async findRequests(filters: {
    customerId?: string;
    artisanId?: string;
  }): Promise<CoCreationRequestContract[]> {
    const where: FindOptionsWhere<CoCreationRequest> = {};
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters.artisanId) {
      where.artisanId = filters.artisanId;
    }

    const requests = await this.requestsRepository.find({
      where,
      order: { updatedAt: 'DESC' },
      relations: ['aiCreation'],
    });
    return requests.map((request) => this.toRequestContract(request));
  }

  async applyArtisanDecision(
    id: string,
    input: {
      decision: 'approve' | 'reject' | 'request_changes';
      artisanNote?: string;
      quoteAmountCents?: number;
      depositAmountCents?: number;
    },
  ): Promise<CoCreationRequestContract> {
    const request = await this.requestsRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Co-creation request with ID "${id}" not found`);
    }

    const next = this.getDecisionState(input.decision);
    if (
      !canTransition(
        CO_CREATION_REQUEST_STATUS_TRANSITIONS,
        request.status as CoCreationRequestStatus,
        next.status,
      ) ||
      !canTransition(
        ARTISAN_APPROVAL_STATE_TRANSITIONS,
        request.approvalState as ArtisanApprovalState,
        next.approvalState,
      )
    ) {
      throw new BadRequestException('This co-creation request cannot move to the requested state.');
    }

    request.status = next.status;
    request.approvalState = next.approvalState;
    request.artisanNote = input.artisanNote?.trim() || undefined;
    request.updatedAt = new Date().toISOString();

    if (input.decision === 'approve') {
      request.quoteAmountCents = input.quoteAmountCents ?? 680000;
      request.quoteCurrency = 'HKD';
      request.depositAmountCents = input.depositAmountCents ?? 150000;
      request.depositCurrency = 'HKD';
    }

    return this.toRequestContract(await this.requestsRepository.save(request));
  }

  private getDecisionState(decision: 'approve' | 'reject' | 'request_changes'): {
    status: CoCreationRequestStatus;
    approvalState: ArtisanApprovalState;
  } {
    if (decision === 'approve') {
      return {
        status: CoCreationRequestStatus.Approved,
        approvalState: ArtisanApprovalState.Approved,
      };
    }
    if (decision === 'reject') {
      return {
        status: CoCreationRequestStatus.Rejected,
        approvalState: ArtisanApprovalState.Rejected,
      };
    }
    return {
      status: CoCreationRequestStatus.ChangesRequested,
      approvalState: ArtisanApprovalState.ChangesRequested,
    };
  }

  private async findArtisanForRequest(craftId: string | number, artisanId?: string): Promise<Artisan | null> {
    if (artisanId) {
      const numericId = Number(artisanId.replace(/^artisan-/, ''));
      if (Number.isFinite(numericId)) {
        return this.artisansRepository.findOne({ where: { id: numericId } });
      }
    }

    const artisans = await this.artisansRepository.find();
    return artisans.find((artisan) => artisan.craftIds.includes(Number(craftId))) ?? artisans[0] ?? null;
  }

  private toArtisanUserId(artisan: Artisan | null): string {
    return artisan?.userId || `artisan-${artisan?.id ?? 'demo'}`;
  }

  private toAiCreationContract(creation: AiCreation): AiCreationContract {
    return {
      id: creation.id,
      customerId: creation.customerId,
      craftId: creation.craftId,
      craftName: creation.craftName,
      prompt: creation.prompt,
      imageUrl: creation.imageUrl,
      referenceImageUrls: creation.referenceImageUrls,
      createdAt: creation.createdAt,
    };
  }

  private toRequestContract(request: CoCreationRequest): CoCreationRequestContract {
    return {
      id: request.id,
      customerId: request.customerId,
      artisanId: request.artisanId,
      craftId: request.craftId,
      aiCreationId: request.aiCreationId,
      prompt: request.prompt,
      referenceImageUrls: request.referenceImageUrls,
      status: request.status as CoCreationRequestStatus,
      approvalState: request.approvalState as ArtisanApprovalState,
      quote:
        request.quoteAmountCents && request.quoteCurrency === 'HKD'
          ? { amount: request.quoteAmountCents, currency: 'HKD' }
          : undefined,
      deposit:
        request.depositAmountCents && request.depositCurrency === 'HKD'
          ? { amount: request.depositAmountCents, currency: 'HKD' }
          : undefined,
      artisanNote: request.artisanNote,
      convertedOrderId: request.convertedOrderId,
    };
  }
}
