import { describe, expect, it } from 'vitest';
import {
  ARTISAN_APPROVAL_STATE_LABELS,
  ARTISAN_APPROVAL_STATE_TRANSITIONS,
  ArtisanApprovalState,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TRANSITIONS,
  BookingStatus,
  CAPACITY_HOLD_STATUS_LABELS,
  CAPACITY_HOLD_STATUS_TRANSITIONS,
  CART_ITEM_TYPE_LABELS,
  CO_CREATION_REQUEST_STATUS_LABELS,
  CO_CREATION_REQUEST_STATUS_TRANSITIONS,
  CapacityHoldStatus,
  CartItemContract,
  CartItemType,
  ChatMessageContract,
  CoCreationRequestContract,
  CoCreationRequestStatus,
  EVENT_TYPE_LABELS,
  EventType,
  MESSAGE_THREAD_CONTEXT_TYPE_LABELS,
  MESSAGE_SENDER_ROLE_LABELS,
  MESSAGE_TYPE_LABELS,
  MessageReplayCursorContract,
  MessageSenderRole,
  MessageThreadContextType,
  MessageThreadSummaryContract,
  MessageType,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  OrderStatus,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TRANSITIONS,
  PaymentStatus,
  StripePaymentReferenceContract,
  WORKSHOP_SCHEDULE_STATUS_TRANSITIONS,
  WORKSHOP_SCHEDULE_STATUS_LABELS,
  WorkshopCapacityHoldContract,
  WorkshopScheduleStatus,
  calculateWorkshopCapacityAvailable,
  canTransition,
  getLocalizedLabel,
  toWorkshopCapacitySnapshot,
} from './contracts';

const expectLabelsForEveryValue = <TStatus extends string>(
  values: TStatus[],
  labels: Record<TStatus, { zh: string; en: string }>,
) => {
  values.forEach((value) => {
    expect(labels[value].en).toEqual(expect.any(String));
    expect(labels[value].en.length).toBeGreaterThan(0);
    expect(labels[value].zh).toEqual(expect.any(String));
    expect(labels[value].zh.length).toBeGreaterThan(0);
  });
};

describe('MVP shared contract labels', () => {
  it('provides bilingual labels for every shared enum value', () => {
    expectLabelsForEveryValue(Object.values(EventType), EVENT_TYPE_LABELS);
    expectLabelsForEveryValue(Object.values(WorkshopScheduleStatus), WORKSHOP_SCHEDULE_STATUS_LABELS);
    expectLabelsForEveryValue(Object.values(CapacityHoldStatus), CAPACITY_HOLD_STATUS_LABELS);
    expectLabelsForEveryValue(Object.values(CartItemType), CART_ITEM_TYPE_LABELS);
    expectLabelsForEveryValue(Object.values(BookingStatus), BOOKING_STATUS_LABELS);
    expectLabelsForEveryValue(Object.values(OrderStatus), ORDER_STATUS_LABELS);
    expectLabelsForEveryValue(Object.values(PaymentStatus), PAYMENT_STATUS_LABELS);
    expectLabelsForEveryValue(Object.values(CoCreationRequestStatus), CO_CREATION_REQUEST_STATUS_LABELS);
    expectLabelsForEveryValue(Object.values(ArtisanApprovalState), ARTISAN_APPROVAL_STATE_LABELS);
    expectLabelsForEveryValue(Object.values(MessageThreadContextType), MESSAGE_THREAD_CONTEXT_TYPE_LABELS);
    expectLabelsForEveryValue(Object.values(MessageSenderRole), MESSAGE_SENDER_ROLE_LABELS);
    expectLabelsForEveryValue(Object.values(MessageType), MESSAGE_TYPE_LABELS);
  });

  it('looks up labels by locale without using display copy as the stored value', () => {
    expect(getLocalizedLabel(ORDER_STATUS_LABELS, OrderStatus.Paid, 'en')).toBe('Payment received');
    expect(getLocalizedLabel(ORDER_STATUS_LABELS, OrderStatus.Paid, 'zh')).toBe('已付款');
    expect(OrderStatus.Paid).toBe('paid');
  });

  it('falls back to the raw status for unknown persisted label values', () => {
    expect(
      getLocalizedLabel(ORDER_STATUS_LABELS, 'legacy_paid' as OrderStatus, 'en'),
    ).toBe('legacy_paid');
  });
});

describe('MVP shared contract transition maps', () => {
  it('allows only explicit capacity hold lifecycle transitions', () => {
    expect(
      canTransition(
        CAPACITY_HOLD_STATUS_TRANSITIONS,
        CapacityHoldStatus.Active,
        CapacityHoldStatus.Converted,
      ),
    ).toBe(true);
    expect(
      canTransition(
        CAPACITY_HOLD_STATUS_TRANSITIONS,
        CapacityHoldStatus.Converted,
        CapacityHoldStatus.Active,
      ),
    ).toBe(false);
  });

  it('allows only explicit workshop schedule lifecycle transitions', () => {
    expect(
      canTransition(
        WORKSHOP_SCHEDULE_STATUS_TRANSITIONS,
        WorkshopScheduleStatus.Draft,
        WorkshopScheduleStatus.Open,
      ),
    ).toBe(true);
    expect(
      canTransition(
        WORKSHOP_SCHEDULE_STATUS_TRANSITIONS,
        WorkshopScheduleStatus.Cancelled,
        WorkshopScheduleStatus.Open,
      ),
    ).toBe(false);
  });

  it('allows only explicit booking lifecycle transitions', () => {
    expect(canTransition(BOOKING_STATUS_TRANSITIONS, BookingStatus.HoldPending, BookingStatus.PendingPayment)).toBe(true);
    expect(canTransition(BOOKING_STATUS_TRANSITIONS, BookingStatus.PendingPayment, BookingStatus.Confirmed)).toBe(true);
    expect(canTransition(BOOKING_STATUS_TRANSITIONS, BookingStatus.Completed, BookingStatus.PendingPayment)).toBe(false);
  });

  it('returns false for unknown persisted status values instead of throwing', () => {
    expect(
      canTransition(
        BOOKING_STATUS_TRANSITIONS,
        'legacy_pending' as BookingStatus,
        BookingStatus.Confirmed,
      ),
    ).toBe(false);
  });

  it('prevents paid orders from returning to pending payment', () => {
    expect(canTransition(ORDER_STATUS_TRANSITIONS, OrderStatus.PendingPayment, OrderStatus.Paid)).toBe(true);
    expect(canTransition(ORDER_STATUS_TRANSITIONS, OrderStatus.Paid, OrderStatus.PendingPayment)).toBe(false);
    expect(canTransition(ORDER_STATUS_TRANSITIONS, OrderStatus.Shipped, OrderStatus.Completed)).toBe(true);
  });

  it('keeps payment states separate from raw Stripe statuses', () => {
    expect(canTransition(PAYMENT_STATUS_TRANSITIONS, PaymentStatus.PendingCheckout, PaymentStatus.Processing)).toBe(true);
    expect(canTransition(PAYMENT_STATUS_TRANSITIONS, PaymentStatus.Paid, PaymentStatus.PendingCheckout)).toBe(false);

    const stripeReference: StripePaymentReferenceContract = {
      stripeCheckoutSessionId: 'cs_test_123',
      stripeCheckoutSessionStatus: 'complete',
      stripePaymentIntentId: 'pi_test_123',
      stripePaymentIntentStatus: 'succeeded',
      stripeLatestEventId: 'evt_test_123',
    };

    expect(stripeReference.stripeLatestEventId).toBe('evt_test_123');
  });

  it('requires artisan approval before co-creation can become an order', () => {
    expect(
      canTransition(
        CO_CREATION_REQUEST_STATUS_TRANSITIONS,
        CoCreationRequestStatus.PendingArtisanReview,
        CoCreationRequestStatus.Approved,
      ),
    ).toBe(true);
    expect(
      canTransition(
        CO_CREATION_REQUEST_STATUS_TRANSITIONS,
        CoCreationRequestStatus.PendingArtisanReview,
        CoCreationRequestStatus.ConvertedToOrder,
      ),
    ).toBe(false);
    expect(
      canTransition(
        CO_CREATION_REQUEST_STATUS_TRANSITIONS,
        CoCreationRequestStatus.Approved,
        CoCreationRequestStatus.ConvertedToOrder,
      ),
    ).toBe(true);
  });

  it('keeps artisan approval terminal states terminal', () => {
    expect(
      canTransition(
        ARTISAN_APPROVAL_STATE_TRANSITIONS,
        ArtisanApprovalState.Pending,
        ArtisanApprovalState.ChangesRequested,
      ),
    ).toBe(true);
    expect(
      canTransition(
        ARTISAN_APPROVAL_STATE_TRANSITIONS,
        ArtisanApprovalState.Approved,
        ArtisanApprovalState.Pending,
      ),
    ).toBe(false);
  });
});

describe('MVP workshop capacity contract', () => {
  it('derives availability from total seats, confirmed seats, and active holds', () => {
    expect(
      calculateWorkshopCapacityAvailable({
        capacityTotal: 12,
        confirmedSeats: 6,
        activeHoldSeats: 3,
      }),
    ).toBe(3);
  });

  it('never reports negative availability', () => {
    expect(
      calculateWorkshopCapacityAvailable({
        capacityTotal: 4,
        confirmedSeats: 4,
        activeHoldSeats: 2,
      }),
    ).toBe(0);
  });

  it('represents pending holds with an expiry before confirmation', () => {
    const hold: WorkshopCapacityHoldContract = {
      id: 'hold_123',
      scheduleId: 'sched_123',
      customerId: 'user_123',
      quantity: 2,
      status: CapacityHoldStatus.Active,
      expiresAt: '2026-06-28T02:15:00.000Z',
    };

    expect(hold.status).toBe(CapacityHoldStatus.Active);
    expect(hold.convertedBookingId).toBeUndefined();
  });

  it('creates read snapshots with derived availability only', () => {
    expect(
      toWorkshopCapacitySnapshot({
        capacityTotal: 10,
        confirmedSeats: 7,
        activeHoldSeats: 2,
      }),
    ).toEqual({
      capacityTotal: 10,
      confirmedSeats: 7,
      activeHoldSeats: 2,
      capacityAvailable: 1,
    });
  });
});

describe('MVP cart and messaging contracts', () => {
  it('keeps co-creation quote and deposit amounts paired with currency', () => {
    const request: CoCreationRequestContract = {
      id: 'request_123',
      customerId: 'user_123',
      artisanId: 'artisan_123',
      craftId: 'craft_123',
      prompt: 'Blue dragon embroidery on a cheongsam',
      referenceImageUrls: ['/images/presets/dragon.jpeg'],
      status: CoCreationRequestStatus.Approved,
      approvalState: ArtisanApprovalState.Approved,
      quote: { amount: 1280000, currency: 'HKD' },
      deposit: { amount: 200000, currency: 'HKD' },
    };

    expect(request.quote?.currency).toBe('HKD');
    expect(request.deposit?.amount).toBe(200000);
  });

  it('uses discriminated cart item types for checkout line items', () => {
    const items: CartItemContract[] = [
      { type: CartItemType.Product, productId: 'product_123', quantity: 1 },
      {
        type: CartItemType.WorkshopSeat,
        eventId: 'event_123',
        scheduleId: 'sched_123',
        quantity: 2,
        holdId: 'hold_123',
      },
      {
        type: CartItemType.CoCreationDeposit,
        coCreationRequestId: 'request_123',
        quantity: 1,
      },
    ];

    expect(items.map((item) => item.type)).toEqual([
      CartItemType.Product,
      CartItemType.WorkshopSeat,
      CartItemType.CoCreationDeposit,
    ]);
  });

  it('separates thread summaries from paginated message history', () => {
    const summary: MessageThreadSummaryContract = {
      id: 'thread_123',
      customerId: 'user_123',
      artisanId: 'artisan_123',
      contextType: MessageThreadContextType.CoCreationRequest,
      contextId: 'request_123',
      lastMessagePreview: 'I can prepare a sketch by Friday.',
      lastMessageAt: '2026-06-28T02:20:00.000Z',
      unreadCount: 1,
    };

    const cursor: MessageReplayCursorContract = {
      threadId: summary.id,
      afterSequence: 42,
      limit: 20,
    };

    const message: ChatMessageContract = {
      id: 'msg_123',
      threadId: summary.id,
      sequence: 43,
      senderId: 'artisan_123',
      senderRole: MessageSenderRole.Artisan,
      type: MessageType.Text,
      originalText: '星期五前可以起稿。',
      translatedText: 'I can prepare a sketch by Friday.',
      sourceLanguage: 'zh',
      targetLanguage: 'en',
      clientMutationId: 'client_msg_123',
      createdAt: '2026-06-28T02:21:00.000Z',
    };

    expect(cursor.afterSequence).toBeLessThan(message.sequence);
    expect(summary).not.toHaveProperty('messages');
    expect(message.clientMutationId).toBe('client_msg_123');
  });
});
