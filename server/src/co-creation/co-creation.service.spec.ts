import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ArtisanApprovalState, CoCreationRequestStatus } from '@craftscape/contracts';
import { AiService } from '../ai/ai.service';
import { AiCreation } from '../entities/ai-creation.entity';
import { Artisan } from '../entities/artisan.entity';
import { CoCreationRequest } from '../entities/co-creation-request.entity';
import { CoCreationService } from './co-creation.service';

const createRepositoryMock = () => ({
  create: jest.fn((value) => value),
  save: jest.fn(async (value) => value),
  find: jest.fn(async () => []),
  findOne: jest.fn(),
});

describe('CoCreationService', () => {
  let service: CoCreationService;
  let requestsRepository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    requestsRepository = createRepositoryMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CoCreationService,
        {
          provide: getRepositoryToken(AiCreation),
          useValue: createRepositoryMock(),
        },
        {
          provide: getRepositoryToken(Artisan),
          useValue: createRepositoryMock(),
        },
        {
          provide: getRepositoryToken(CoCreationRequest),
          useValue: requestsRepository,
        },
        {
          provide: AiService,
          useValue: {
            generateCraftImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(CoCreationService);
  });

  it('approves a pending co-creation request with quote and deposit', async () => {
    requestsRepository.findOne.mockResolvedValue({
      id: 'request_123',
      customerId: 'customer-demo',
      artisanId: 'artisan-4',
      craftId: '4',
      prompt: 'Dragon embroidery',
      referenceImageUrls: ['image.png'],
      status: CoCreationRequestStatus.PendingArtisanReview,
      approvalState: ArtisanApprovalState.Pending,
      createdAt: '2026-06-28T00:00:00.000Z',
      updatedAt: '2026-06-28T00:00:00.000Z',
    });

    const result = await service.applyArtisanDecision('request_123', {
      decision: 'approve',
      quoteAmountCents: 680000,
      depositAmountCents: 150000,
      artisanNote: 'Approved with quote.',
    });

    expect(result.status).toBe(CoCreationRequestStatus.Approved);
    expect(result.approvalState).toBe(ArtisanApprovalState.Approved);
    expect(result.quote).toEqual({ amount: 680000, currency: 'HKD' });
    expect(result.deposit).toEqual({ amount: 150000, currency: 'HKD' });
  });

  it('saves preset concepts as customer-owned AI creation records', async () => {
    const result = await service.createConcept({
      craftId: 4,
      craftName: { zh: '中式長衫', en: 'Cheongsam Making' },
      prompt: 'Dragon embroidery preset',
      imageUrl: '/images/presets/dragon.jpeg',
    });

    expect(result.id).toMatch(/^creation_/);
    expect(result.customerId).toBe('customer-demo');
    expect(result.imageUrl).toBe('/images/presets/dragon.jpeg');
    expect(result.referenceImageUrls).toEqual(['/images/presets/dragon.jpeg']);
  });

  it('rejects invalid approval transitions from terminal states', async () => {
    requestsRepository.findOne.mockResolvedValue({
      id: 'request_123',
      customerId: 'customer-demo',
      artisanId: 'artisan-4',
      craftId: '4',
      prompt: 'Dragon embroidery',
      referenceImageUrls: ['image.png'],
      status: CoCreationRequestStatus.Approved,
      approvalState: ArtisanApprovalState.Approved,
      createdAt: '2026-06-28T00:00:00.000Z',
      updatedAt: '2026-06-28T00:00:00.000Z',
    });

    await expect(
      service.applyArtisanDecision('request_123', {
        decision: 'request_changes',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
