import type { CheckoutIntent } from '../types';
import {
  CartItemType,
  OrderStatus,
  PaymentStatus,
  type CheckoutItemInputContract,
  type CurrencyCode,
  type CustomerOrderHistoryEntryContract,
  type LocalizedString,
  type MoneyAmountCents,
  type MoneyContract,
  type WorkshopScheduleContract,
} from '../shared/contracts';

export const CO_CREATION_DEPOSIT_TITLE: LocalizedString = {
  zh: '共創訂金',
  en: 'Co-creation deposit',
};

export interface CheckoutLineView {
  itemType: CartItemType;
  title: LocalizedString;
  imageUrl?: string;
  schedule?: WorkshopScheduleContract;
  quantity: number;
  unitAmount: MoneyAmountCents;
  currency: CurrencyCode;
  quote?: MoneyContract;
  item: CheckoutItemInputContract;
  orderId?: string;
}

/** Maps a checkout intent to display data plus the backend request payload. */
export function deriveCheckoutLine(intent: CheckoutIntent): CheckoutLineView {
  switch (intent.kind) {
    case 'workshop':
      return {
        itemType: CartItemType.WorkshopSeat,
        title: intent.event.title,
        imageUrl: intent.event.image,
        schedule: intent.schedule,
        quantity: intent.booking.quantity,
        unitAmount: intent.schedule.price,
        currency: intent.schedule.currency,
        item: { type: CartItemType.WorkshopSeat, bookingId: intent.booking.id },
      };
    case 'product':
      return {
        itemType: CartItemType.Product,
        title: intent.product.name,
        imageUrl: intent.product.image,
        quantity: intent.quantity,
        unitAmount:
          intent.product.priceMoney?.amount ?? Math.round(intent.product.price * 100),
        currency: intent.product.priceMoney?.currency ?? 'HKD',
        item: {
          type: CartItemType.Product,
          productId: String(intent.product.id),
          quantity: intent.quantity,
        },
      };
    case 'cocreation':
      return {
        itemType: CartItemType.CoCreationDeposit,
        title: CO_CREATION_DEPOSIT_TITLE,
        imageUrl: intent.request.referenceImageUrls[0],
        quantity: 1,
        unitAmount: intent.request.deposit?.amount ?? 0,
        currency: intent.request.deposit?.currency ?? 'HKD',
        quote: intent.request.quote,
        item: {
          type: CartItemType.CoCreationDeposit,
          coCreationRequestId: intent.request.id,
        },
      };
    case 'retry': {
      const orderItem = intent.order.items[0];
      const item: CheckoutItemInputContract =
        orderItem.type === CartItemType.Product
          ? {
              type: CartItemType.Product,
              productId: orderItem.productId ?? '',
              quantity: orderItem.quantity,
            }
          : orderItem.type === CartItemType.WorkshopSeat
            ? { type: CartItemType.WorkshopSeat, bookingId: orderItem.bookingId ?? '' }
            : {
                type: CartItemType.CoCreationDeposit,
                coCreationRequestId: orderItem.coCreationRequestId ?? '',
              };
      return {
        itemType: orderItem.type,
        title: orderItem.title ?? CO_CREATION_DEPOSIT_TITLE,
        imageUrl: orderItem.imageUrl,
        quantity: orderItem.quantity,
        unitAmount: orderItem.unitAmount,
        currency: orderItem.currency,
        item,
        orderId: intent.order.id,
      };
    }
  }
}

export type CheckoutOutcome = 'success' | 'processing' | 'failed' | 'cancelled';

/** Derives the confirmation state from the order itself; `hint` covers the
 * Stripe cancel-URL return, where the order is still pending checkout. */
export function deriveCheckoutOutcome(
  entry: CustomerOrderHistoryEntryContract,
  hint?: 'success' | 'cancelled',
): CheckoutOutcome {
  const paymentStatus = entry.order.paymentStatus;
  if (paymentStatus === PaymentStatus.Paid) {
    return 'success';
  }
  if (paymentStatus === PaymentStatus.Failed) {
    return 'failed';
  }
  if (
    paymentStatus === PaymentStatus.Cancelled ||
    entry.order.status === OrderStatus.Cancelled
  ) {
    return 'cancelled';
  }
  return hint === 'cancelled' ? 'cancelled' : 'processing';
}

export function canRetryOrder(entry: CustomerOrderHistoryEntryContract): boolean {
  return entry.order.status === OrderStatus.PendingPayment;
}

export function formatScheduleRange(
  schedule: WorkshopScheduleContract,
  language: 'zh' | 'en',
): string {
  const locale = language === 'zh' ? 'zh-HK' : 'en-HK';
  const start = new Date(schedule.startsAt);
  const end = new Date(schedule.endsAt);
  const date = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: schedule.timezone,
  }).format(start);
  const startTime = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: schedule.timezone,
  }).format(start);
  const endTime = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: schedule.timezone,
  }).format(end);
  return `${date} · ${startTime} – ${endTime}`;
}
