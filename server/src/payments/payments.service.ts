import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import {
  BOOKING_STATUS_TRANSITIONS,
  BookingContract,
  BookingStatus,
  CO_CREATION_REQUEST_STATUS_TRANSITIONS,
  CartItemType,
  CheckoutSessionResultContract,
  CoCreationRequestStatus,
  CustomerOrderHistoryEntryContract,
  LocalizedString,
  ORDER_STATUS_TRANSITIONS,
  OrderContract,
  OrderItemContract,
  OrderStatus,
  PAYMENT_STATUS_TRANSITIONS,
  PaymentStatus,
  WORKSHOP_SCHEDULE_STATUS_TRANSITIONS,
  WorkshopScheduleStatus,
  canTransition,
  toWorkshopCapacitySnapshot,
} from '@craftscape/contracts';
import { Booking } from '../entities/booking.entity';
import { CheckoutOrder } from '../entities/checkout-order.entity';
import { CoCreationRequest } from '../entities/co-creation-request.entity';
import { Event } from '../entities/event.entity';
import { Product } from '../entities/product.entity';
import {
  getCheckoutReturnBaseUrl,
  getStripeSecretKey,
  getStripeWebhookSecret,
  isPaymentsSimulated,
} from '../config/payments.config';
import { toHkdCents } from './pricing.util';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

const DEMO_CUSTOMER_ID = 'customer-demo';

const CO_CREATION_DEPOSIT_TITLE: LocalizedString = {
  zh: '共創訂金',
  en: 'Co-creation deposit',
};

interface ResolvedCheckoutLine {
  item: OrderItemContract;
  customerId: string;
  artisanId?: string;
  bookingId?: string;
  coCreationRequestId?: string;
}

@Injectable()
export class PaymentsService {
  private stripe?: Stripe;

  constructor(
    @InjectRepository(CheckoutOrder)
    private readonly ordersRepository: Repository<CheckoutOrder>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(CoCreationRequest)
    private readonly coCreationRepository: Repository<CoCreationRequest>,
  ) {
    const secretKey = getStripeSecretKey();
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    }
  }

  async createCheckoutSession(dto: CreateCheckoutSessionDto): Promise<CheckoutSessionResultContract> {
    const line = await this.resolveCheckoutLine(dto);
    const order = await this.getOrCreateOrder(dto, line);

    if (isPaymentsSimulated()) {
      return this.completeSimulatedCheckout(order, dto.simulatedOutcome ?? 'success');
    }

    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Payments are not configured. Set STRIPE_SECRET_KEY or PAYMENTS_SIMULATED=true.',
      );
    }

    const session = await this.createStripeSession(order);
    order.stripeCheckoutSessionId = session.id;
    order.updatedAt = new Date().toISOString();
    const saved = await this.ordersRepository.save(order);

    return {
      mode: 'stripe',
      order: this.toOrderContract(saved),
      booking: await this.findBookingContract(saved.bookingId),
      checkoutUrl: session.url ?? undefined,
      message: {
        zh: '正在前往 Stripe 安全付款頁面。',
        en: 'Redirecting to the secure Stripe payment page.',
      },
    };
  }

  async getOrderHistory(customerId: string): Promise<CustomerOrderHistoryEntryContract[]> {
    const orders = await this.ordersRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      orders.map(async (order) => ({
        order: this.toOrderContract(order),
        booking: await this.findBookingContract(order.bookingId),
      })),
    );
  }

  async getOrder(id: string): Promise<CustomerOrderHistoryEntryContract> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return {
      order: this.toOrderContract(order),
      booking: await this.findBookingContract(order.bookingId),
    };
  }

  async cancelOrder(id: string, customerId?: string): Promise<CustomerOrderHistoryEntryContract> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    if (customerId && order.customerId !== customerId) {
      throw new ForbiddenException('This order belongs to another customer.');
    }
    await this.markOrderCancelled(order);
    return this.getOrder(id);
  }

  /**
   * Handles a raw Stripe webhook request. Verifies the signature before
   * trusting any payload content.
   */
  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined): Promise<{ received: boolean }> {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured.');
    }
    const webhookSecret = getStripeWebhookSecret();
    if (!webhookSecret) {
      throw new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET is not configured.');
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header.');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      throw new BadRequestException(
        `Stripe webhook signature verification failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const order = await this.findOrderForSession(session);
        if (order && !this.isDuplicateEvent(order, event.id)) {
          order.stripePaymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : order.stripePaymentIntentId;
          order.stripeLatestEventId = event.id;
          if (session.payment_status === 'paid') {
            await this.confirmOrderPayment(order);
          } else {
            await this.markPaymentProcessing(order);
          }
        }
        break;
      }
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const order = await this.findOrderForSession(session);
        if (order && !this.isDuplicateEvent(order, event.id)) {
          order.stripeLatestEventId = event.id;
          await this.markPaymentFailed(order);
        }
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const order = await this.findOrderForSession(session);
        if (order && !this.isDuplicateEvent(order, event.id)) {
          order.stripeLatestEventId = event.id;
          await this.markOrderCancelled(order);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const orderId = intent.metadata?.orderId;
        const order = orderId
          ? await this.ordersRepository.findOne({ where: { id: orderId } })
          : null;
        if (order && !this.isDuplicateEvent(order, event.id)) {
          order.stripeLatestEventId = event.id;
          await this.markPaymentFailed(order);
        }
        break;
      }
      default:
        // Acknowledge unhandled event types (refunds/disputes are out of MVP scope).
        break;
    }

    return { received: true };
  }

  private async resolveCheckoutLine(dto: CreateCheckoutSessionDto): Promise<ResolvedCheckoutLine> {
    const item = dto.item;
    switch (item.type) {
      case CartItemType.Product: {
        if (!item.productId || !item.quantity) {
          throw new BadRequestException('productId and quantity are required for product checkout.');
        }
        const product = await this.productsRepository.findOne({
          where: { id: Number(item.productId) },
        });
        if (!product) {
          throw new NotFoundException(`Product with ID "${item.productId}" not found`);
        }
        const unitAmount = toHkdCents(product.price);
        if (unitAmount <= 0) {
          throw new BadRequestException(
            'This product is priced on request and cannot be purchased directly.',
          );
        }
        return {
          customerId: dto.customerId || DEMO_CUSTOMER_ID,
          item: {
            id: `item_${randomUUID()}`,
            type: CartItemType.Product,
            quantity: item.quantity,
            unitAmount,
            currency: 'HKD',
            productId: String(product.id),
            title: product.name,
            imageUrl: product.image,
          },
        };
      }
      case CartItemType.WorkshopSeat: {
        if (!item.bookingId) {
          throw new BadRequestException('bookingId is required for workshop checkout.');
        }
        const booking = await this.bookingsRepository.findOne({ where: { id: item.bookingId } });
        if (!booking) {
          throw new NotFoundException(`Booking with ID "${item.bookingId}" not found`);
        }
        if (dto.customerId && booking.customerId !== dto.customerId) {
          throw new ForbiddenException('This booking belongs to another customer.');
        }
        if (booking.status === BookingStatus.PaymentFailed) {
          // Payment retry: move the booking back to pending payment.
          booking.status = BookingStatus.PendingPayment;
          booking.paymentStatus = PaymentStatus.PendingCheckout;
          await this.bookingsRepository.save(booking);
        }
        if (booking.status !== BookingStatus.PendingPayment) {
          throw new BadRequestException('Only pending bookings can proceed to checkout.');
        }
        const event = await this.eventsRepository.findOne({
          where: { id: Number(booking.eventId) },
        });
        return {
          customerId: booking.customerId,
          artisanId: booking.artisanId,
          bookingId: booking.id,
          item: {
            id: `item_${randomUUID()}`,
            type: CartItemType.WorkshopSeat,
            quantity: booking.quantity,
            unitAmount: booking.unitAmount,
            currency: booking.currency,
            bookingId: booking.id,
            title: event?.title,
            imageUrl: event?.image,
          },
        };
      }
      case CartItemType.CoCreationDeposit: {
        if (!item.coCreationRequestId) {
          throw new BadRequestException('coCreationRequestId is required for co-creation checkout.');
        }
        const request = await this.coCreationRepository.findOne({
          where: { id: item.coCreationRequestId },
        });
        if (!request) {
          throw new NotFoundException(
            `Co-creation request with ID "${item.coCreationRequestId}" not found`,
          );
        }
        if (dto.customerId && request.customerId !== dto.customerId) {
          throw new ForbiddenException('This co-creation request belongs to another customer.');
        }
        if (request.status !== CoCreationRequestStatus.Approved) {
          throw new BadRequestException(
            'Only artisan-approved co-creation requests can proceed to deposit checkout.',
          );
        }
        if (!request.depositAmountCents || request.depositAmountCents <= 0) {
          throw new BadRequestException('This co-creation request has no artisan-quoted deposit.');
        }
        return {
          customerId: request.customerId,
          artisanId: request.artisanId,
          coCreationRequestId: request.id,
          item: {
            id: `item_${randomUUID()}`,
            type: CartItemType.CoCreationDeposit,
            quantity: 1,
            unitAmount: request.depositAmountCents,
            currency: 'HKD',
            coCreationRequestId: request.id,
            title: CO_CREATION_DEPOSIT_TITLE,
            imageUrl: request.referenceImageUrls?.[0],
          },
        };
      }
      default:
        throw new BadRequestException('Unsupported checkout item type.');
    }
  }

  private async getOrCreateOrder(
    dto: CreateCheckoutSessionDto,
    line: ResolvedCheckoutLine,
  ): Promise<CheckoutOrder> {
    const now = new Date().toISOString();

    if (dto.orderId) {
      const existing = await this.ordersRepository.findOne({ where: { id: dto.orderId } });
      if (!existing) {
        throw new NotFoundException(`Order with ID "${dto.orderId}" not found`);
      }
      if (existing.customerId !== line.customerId) {
        throw new ForbiddenException('This order belongs to another customer.');
      }
      if (existing.status !== OrderStatus.PendingPayment) {
        throw new BadRequestException('Only pending orders can retry checkout.');
      }
      if (
        existing.paymentStatus === PaymentStatus.Failed &&
        canTransition(
          PAYMENT_STATUS_TRANSITIONS,
          PaymentStatus.Failed,
          PaymentStatus.PendingCheckout,
        )
      ) {
        existing.paymentStatus = PaymentStatus.PendingCheckout;
      }
      existing.updatedAt = now;
      return this.ordersRepository.save(existing);
    }

    const subtotal = line.item.unitAmount * line.item.quantity;
    const order = this.ordersRepository.create({
      id: `order_${randomUUID()}`,
      customerId: line.customerId,
      artisanId: line.artisanId,
      items: [line.item],
      subtotal,
      total: subtotal,
      currency: line.item.currency,
      status: OrderStatus.PendingPayment,
      paymentStatus: PaymentStatus.PendingCheckout,
      bookingId: line.bookingId,
      coCreationRequestId: line.coCreationRequestId,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.ordersRepository.save(order);

    if (line.bookingId) {
      await this.bookingsRepository.update(line.bookingId, { orderId: saved.id });
    }

    return saved;
  }

  private async completeSimulatedCheckout(
    order: CheckoutOrder,
    outcome: 'success' | 'failure' | 'cancelled',
  ): Promise<CheckoutSessionResultContract> {
    if (outcome === 'failure') {
      await this.markPaymentFailed(order);
    } else if (outcome === 'cancelled') {
      await this.markOrderCancelled(order);
    } else {
      await this.confirmOrderPayment(order);
    }

    const entry = await this.getOrder(order.id);
    const messages: Record<typeof outcome, LocalizedString> = {
      success: {
        zh: '模擬付款成功，訂單已確認。',
        en: 'Simulated payment succeeded; the order is confirmed.',
      },
      failure: {
        zh: '模擬付款失敗，可重新嘗試付款。',
        en: 'Simulated payment failed; you can retry the payment.',
      },
      cancelled: {
        zh: '模擬付款已取消。',
        en: 'Simulated payment was cancelled.',
      },
    };

    return {
      mode: 'simulated',
      order: entry.order,
      booking: entry.booking,
      message: messages[outcome],
    };
  }

  private async createStripeSession(order: CheckoutOrder): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured.');
    }
    const baseUrl = getCheckoutReturnBaseUrl().replace(/\/$/, '');
    return this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: item.currency.toLowerCase(),
          unit_amount: item.unitAmount,
          product_data: {
            name: item.title ? `${item.title.en} · ${item.title.zh}` : 'CraftscapeHK order',
            ...(item.imageUrl && /^https?:\/\//.test(item.imageUrl)
              ? { images: [item.imageUrl] }
              : {}),
          },
        },
      })),
      metadata: { orderId: order.id },
      payment_intent_data: { metadata: { orderId: order.id } },
      success_url: `${baseUrl}/?checkout=success&orderId=${order.id}`,
      cancel_url: `${baseUrl}/?checkout=cancelled&orderId=${order.id}`,
    });
  }

  private async findOrderForSession(session: Stripe.Checkout.Session): Promise<CheckoutOrder | null> {
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const byId = await this.ordersRepository.findOne({ where: { id: orderId } });
      if (byId) {
        return byId;
      }
    }
    return this.ordersRepository.findOne({ where: { stripeCheckoutSessionId: session.id } });
  }

  private isDuplicateEvent(order: CheckoutOrder, eventId: string): boolean {
    return order.stripeLatestEventId === eventId;
  }

  /** Confirms payment: order → paid, booking → confirmed (+capacity), request → converted. */
  private async confirmOrderPayment(order: CheckoutOrder): Promise<void> {
    if (order.paymentStatus === PaymentStatus.Paid) {
      return;
    }
    if (!canTransition(ORDER_STATUS_TRANSITIONS, order.status as OrderStatus, OrderStatus.Paid)) {
      return;
    }

    order.status = OrderStatus.Paid;
    order.paymentStatus = PaymentStatus.Paid;
    order.updatedAt = new Date().toISOString();
    await this.ordersRepository.save(order);

    if (order.bookingId) {
      await this.confirmBooking(order.bookingId);
    }
    if (order.coCreationRequestId) {
      await this.convertCoCreationRequest(order.coCreationRequestId, order.id);
    }
  }

  private async confirmBooking(bookingId: string): Promise<void> {
    const booking = await this.bookingsRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      return;
    }
    if (
      !canTransition(
        BOOKING_STATUS_TRANSITIONS,
        booking.status as BookingStatus,
        BookingStatus.Confirmed,
      )
    ) {
      return;
    }
    booking.status = BookingStatus.Confirmed;
    booking.paymentStatus = PaymentStatus.Paid;
    await this.bookingsRepository.save(booking);
    await this.decrementScheduleCapacity(booking);
  }

  /** Confirmed seats move into the schedule's persisted capacity snapshot. */
  private async decrementScheduleCapacity(booking: Booking): Promise<void> {
    const event = await this.eventsRepository.findOne({ where: { id: Number(booking.eventId) } });
    const schedule = event?.schedules?.find((entry) => entry.id === booking.scheduleId);
    if (!event || !schedule) {
      return;
    }

    const capacity = toWorkshopCapacitySnapshot({
      capacityTotal: schedule.capacity.capacityTotal,
      confirmedSeats: schedule.capacity.confirmedSeats + booking.quantity,
      activeHoldSeats: schedule.capacity.activeHoldSeats,
    });
    const status =
      capacity.capacityAvailable === 0 &&
      canTransition(WORKSHOP_SCHEDULE_STATUS_TRANSITIONS, schedule.status, WorkshopScheduleStatus.Full)
        ? WorkshopScheduleStatus.Full
        : schedule.status;

    event.schedules = event.schedules!.map((entry) =>
      entry.id === schedule.id ? { ...entry, capacity, status } : entry,
    );
    await this.eventsRepository.save(event);
  }

  private async convertCoCreationRequest(requestId: string, orderId: string): Promise<void> {
    const request = await this.coCreationRepository.findOne({ where: { id: requestId } });
    if (!request) {
      return;
    }
    if (
      !canTransition(
        CO_CREATION_REQUEST_STATUS_TRANSITIONS,
        request.status as CoCreationRequestStatus,
        CoCreationRequestStatus.ConvertedToOrder,
      )
    ) {
      return;
    }
    request.status = CoCreationRequestStatus.ConvertedToOrder;
    request.convertedOrderId = orderId;
    request.updatedAt = new Date().toISOString();
    await this.coCreationRepository.save(request);
  }

  private async markPaymentProcessing(order: CheckoutOrder): Promise<void> {
    if (
      canTransition(
        PAYMENT_STATUS_TRANSITIONS,
        order.paymentStatus as PaymentStatus,
        PaymentStatus.Processing,
      )
    ) {
      order.paymentStatus = PaymentStatus.Processing;
    }
    order.updatedAt = new Date().toISOString();
    await this.ordersRepository.save(order);
  }

  private async markPaymentFailed(order: CheckoutOrder): Promise<void> {
    if (
      canTransition(
        PAYMENT_STATUS_TRANSITIONS,
        order.paymentStatus as PaymentStatus,
        PaymentStatus.Failed,
      )
    ) {
      order.paymentStatus = PaymentStatus.Failed;
    }
    order.updatedAt = new Date().toISOString();
    await this.ordersRepository.save(order);

    if (order.bookingId) {
      const booking = await this.bookingsRepository.findOne({ where: { id: order.bookingId } });
      if (
        booking &&
        canTransition(
          BOOKING_STATUS_TRANSITIONS,
          booking.status as BookingStatus,
          BookingStatus.PaymentFailed,
        )
      ) {
        booking.status = BookingStatus.PaymentFailed;
        booking.paymentStatus = PaymentStatus.Failed;
        await this.bookingsRepository.save(booking);
      }
    }
  }

  private async markOrderCancelled(order: CheckoutOrder): Promise<void> {
    if (
      !canTransition(ORDER_STATUS_TRANSITIONS, order.status as OrderStatus, OrderStatus.Cancelled)
    ) {
      throw new BadRequestException('This order can no longer be cancelled.');
    }
    order.status = OrderStatus.Cancelled;
    if (
      canTransition(
        PAYMENT_STATUS_TRANSITIONS,
        order.paymentStatus as PaymentStatus,
        PaymentStatus.Cancelled,
      )
    ) {
      order.paymentStatus = PaymentStatus.Cancelled;
    }
    order.updatedAt = new Date().toISOString();
    await this.ordersRepository.save(order);

    if (order.bookingId) {
      const booking = await this.bookingsRepository.findOne({ where: { id: order.bookingId } });
      if (
        booking &&
        canTransition(
          BOOKING_STATUS_TRANSITIONS,
          booking.status as BookingStatus,
          BookingStatus.Cancelled,
        )
      ) {
        booking.status = BookingStatus.Cancelled;
        booking.paymentStatus = booking.paymentStatus === PaymentStatus.Paid
          ? booking.paymentStatus
          : PaymentStatus.Cancelled;
        await this.bookingsRepository.save(booking);
      }
    }
  }

  private async findBookingContract(bookingId?: string): Promise<BookingContract | undefined> {
    if (!bookingId) {
      return undefined;
    }
    const booking = await this.bookingsRepository.findOne({ where: { id: bookingId } });
    return booking ? this.toBookingContract(booking) : undefined;
  }

  private toBookingContract(booking: Booking): BookingContract {
    return {
      id: booking.id,
      customerId: booking.customerId,
      artisanId: booking.artisanId,
      eventId: booking.eventId,
      scheduleId: booking.scheduleId,
      quantity: booking.quantity,
      status: booking.status as BookingStatus,
      paymentStatus: booking.paymentStatus as PaymentStatus,
      capacityHoldId: booking.capacityHoldId,
      orderId: booking.orderId,
    };
  }

  private toOrderContract(order: CheckoutOrder): OrderContract {
    return {
      id: order.id,
      customerId: order.customerId,
      artisanId: order.artisanId,
      items: order.items,
      subtotal: order.subtotal,
      total: order.total,
      currency: order.currency,
      status: order.status as OrderStatus,
      paymentStatus: order.paymentStatus as PaymentStatus,
      bookingIds: order.bookingId ? [order.bookingId] : undefined,
      coCreationRequestId: order.coCreationRequestId,
      stripe: order.stripeCheckoutSessionId
        ? {
            stripeCheckoutSessionId: order.stripeCheckoutSessionId,
            stripePaymentIntentId: order.stripePaymentIntentId,
            stripeLatestEventId: order.stripeLatestEventId,
          }
        : undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
