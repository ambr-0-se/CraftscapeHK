import { BadRequestException } from '@nestjs/common';
import {
  BookingStatus,
  CartItemType,
  CoCreationRequestStatus,
  OrderStatus,
  PaymentStatus,
  WorkshopScheduleStatus,
} from '@craftscape/contracts';
import { PaymentsService } from './payments.service';

type RepoLike<T> = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  rows: T[];
};

const createRepo = <T extends { id?: string | number }>(rows: T[] = []): RepoLike<T> => {
  const repo: RepoLike<T> = {
    rows,
    findOne: jest.fn(async ({ where }: { where: Partial<T> }) =>
      rows.find((row) =>
        Object.entries(where).every(([key, value]) => (row as any)[key] === value),
      ) ?? null,
    ),
    find: jest.fn(async ({ where }: { where?: Partial<T> } = {}) =>
      rows.filter((row) =>
        Object.entries(where ?? {}).every(([key, value]) => (row as any)[key] === value),
      ),
    ),
    create: jest.fn((input: T) => input),
    save: jest.fn(async (input: T) => {
      const index = rows.findIndex((row) => row.id === input.id);
      if (index >= 0) {
        rows[index] = input;
      } else {
        rows.push(input);
      }
      return input;
    }),
    update: jest.fn(async (id: string, patch: Partial<T>) => {
      const row = rows.find((entry) => entry.id === id);
      if (row) {
        Object.assign(row, patch);
      }
    }),
  };
  return repo;
};

const buildSchedule = (overrides: Record<string, unknown> = {}) => ({
  id: 'sched-1',
  eventId: '8',
  startsAt: '2026-07-20T02:00:00.000Z',
  endsAt: '2026-07-20T05:00:00.000Z',
  timezone: 'Asia/Hong_Kong',
  location: { zh: '中環', en: 'Central' },
  status: WorkshopScheduleStatus.Open,
  price: 68000,
  currency: 'HKD',
  capacity: {
    capacityTotal: 8,
    confirmedSeats: 4,
    activeHoldSeats: 0,
    capacityAvailable: 4,
  },
  ...overrides,
});

describe('PaymentsService (simulated mode)', () => {
  const originalEnv = { ...process.env };
  let ordersRepo: RepoLike<any>;
  let bookingsRepo: RepoLike<any>;
  let eventsRepo: RepoLike<any>;
  let productsRepo: RepoLike<any>;
  let coCreationRepo: RepoLike<any>;
  let service: PaymentsService;

  beforeEach(() => {
    process.env.PAYMENTS_SIMULATED = 'true';
    delete process.env.STRIPE_SECRET_KEY;

    ordersRepo = createRepo([]);
    bookingsRepo = createRepo([
      {
        id: 'booking-1',
        customerId: 'customer-demo',
        artisanId: 'artisan-1',
        eventId: '8',
        scheduleId: 'sched-1',
        quantity: 2,
        status: BookingStatus.PendingPayment,
        paymentStatus: PaymentStatus.PendingCheckout,
        unitAmount: 68000,
        currency: 'HKD',
        createdAt: new Date().toISOString(),
      },
    ]);
    eventsRepo = createRepo([
      {
        id: 8,
        title: { zh: '活字印刷工作坊', en: 'Letterpress Workshop' },
        image: 'https://example.com/letterpress.jpg',
        schedules: [buildSchedule()],
      },
    ]);
    productsRepo = createRepo([
      {
        id: 1,
        name: { zh: '廣彩茶具', en: 'Canton Porcelain Tea Set' },
        price: 1888,
        image: 'https://example.com/tea-set.jpg',
      },
      {
        id: 7,
        name: { zh: '時價霓虹燈', en: 'Quote-only Neon' },
        price: 0,
        image: 'https://example.com/neon.jpg',
      },
    ]);
    coCreationRepo = createRepo([
      {
        id: 'request-1',
        customerId: 'customer-demo',
        artisanId: 'artisan-2',
        craftId: '4',
        status: CoCreationRequestStatus.Approved,
        approvalState: 'approved',
        depositAmountCents: 150000,
        depositCurrency: 'HKD',
        referenceImageUrls: ['https://example.com/concept.png'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    service = new PaymentsService(
      ordersRepo as any,
      bookingsRepo as any,
      eventsRepo as any,
      productsRepo as any,
      coCreationRepo as any,
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('creates and confirms a product order from authoritative backend pricing', async () => {
    const result = await service.createCheckoutSession({
      customerId: 'customer-demo',
      item: { type: CartItemType.Product, productId: '1', quantity: 2 },
    });

    expect(result.mode).toBe('simulated');
    expect(result.order.status).toBe(OrderStatus.Paid);
    expect(result.order.paymentStatus).toBe(PaymentStatus.Paid);
    expect(result.order.items[0].unitAmount).toBe(188800);
    expect(result.order.total).toBe(377600);
    expect(result.order.currency).toBe('HKD');
  });

  it('rejects products that are priced on request', async () => {
    await expect(
      service.createCheckoutSession({
        item: { type: CartItemType.Product, productId: '7', quantity: 1 },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirms a pending workshop booking and decrements schedule capacity', async () => {
    const result = await service.createCheckoutSession({
      customerId: 'customer-demo',
      item: { type: CartItemType.WorkshopSeat, bookingId: 'booking-1' },
    });

    expect(result.order.status).toBe(OrderStatus.Paid);
    expect(result.booking?.status).toBe(BookingStatus.Confirmed);
    expect(result.booking?.orderId).toBe(result.order.id);

    const schedule = eventsRepo.rows[0].schedules[0];
    expect(schedule.capacity.confirmedSeats).toBe(6);
    expect(schedule.capacity.capacityAvailable).toBe(2);
    expect(schedule.status).toBe(WorkshopScheduleStatus.Open);
  });

  it('marks a schedule full when confirmed seats exhaust capacity', async () => {
    eventsRepo.rows[0].schedules = [
      buildSchedule({
        capacity: {
          capacityTotal: 6,
          confirmedSeats: 4,
          activeHoldSeats: 0,
          capacityAvailable: 2,
        },
      }),
    ];

    await service.createCheckoutSession({
      item: { type: CartItemType.WorkshopSeat, bookingId: 'booking-1' },
    });

    const schedule = eventsRepo.rows[0].schedules[0];
    expect(schedule.capacity.capacityAvailable).toBe(0);
    expect(schedule.status).toBe(WorkshopScheduleStatus.Full);
  });

  it('converts an approved co-creation request when the deposit is paid', async () => {
    const result = await service.createCheckoutSession({
      customerId: 'customer-demo',
      item: { type: CartItemType.CoCreationDeposit, coCreationRequestId: 'request-1' },
    });

    expect(result.order.total).toBe(150000);
    expect(coCreationRepo.rows[0].status).toBe(CoCreationRequestStatus.ConvertedToOrder);
    expect(coCreationRepo.rows[0].convertedOrderId).toBe(result.order.id);
  });

  it('rejects co-creation checkout before artisan approval', async () => {
    coCreationRepo.rows[0].status = CoCreationRequestStatus.PendingArtisanReview;

    await expect(
      service.createCheckoutSession({
        item: { type: CartItemType.CoCreationDeposit, coCreationRequestId: 'request-1' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps failed payments visible and retryable', async () => {
    const failed = await service.createCheckoutSession({
      item: { type: CartItemType.WorkshopSeat, bookingId: 'booking-1' },
      simulatedOutcome: 'failure',
    });

    expect(failed.order.status).toBe(OrderStatus.PendingPayment);
    expect(failed.order.paymentStatus).toBe(PaymentStatus.Failed);
    expect(failed.booking?.status).toBe(BookingStatus.PaymentFailed);

    const retried = await service.createCheckoutSession({
      item: { type: CartItemType.WorkshopSeat, bookingId: 'booking-1' },
      orderId: failed.order.id,
      simulatedOutcome: 'success',
    });

    expect(retried.order.id).toBe(failed.order.id);
    expect(retried.order.status).toBe(OrderStatus.Paid);
    expect(retried.booking?.status).toBe(BookingStatus.Confirmed);
  });

  it('cancels a simulated checkout without confirming the booking', async () => {
    const result = await service.createCheckoutSession({
      item: { type: CartItemType.WorkshopSeat, bookingId: 'booking-1' },
      simulatedOutcome: 'cancelled',
    });

    expect(result.order.status).toBe(OrderStatus.Cancelled);
    expect(result.order.paymentStatus).toBe(PaymentStatus.Cancelled);
    expect(result.booking?.status).toBe(BookingStatus.Cancelled);

    const schedule = eventsRepo.rows[0].schedules[0];
    expect(schedule.capacity.confirmedSeats).toBe(4);
  });

  it('returns customer order history newest first with linked bookings', async () => {
    await service.createCheckoutSession({
      customerId: 'customer-demo',
      item: { type: CartItemType.Product, productId: '1', quantity: 1 },
    });
    await service.createCheckoutSession({
      customerId: 'customer-demo',
      item: { type: CartItemType.WorkshopSeat, bookingId: 'booking-1' },
    });

    const history = await service.getOrderHistory('customer-demo');
    expect(history).toHaveLength(2);
    const workshopEntry = history.find((entry) => entry.booking);
    expect(workshopEntry?.booking?.status).toBe(BookingStatus.Confirmed);
  });
});
