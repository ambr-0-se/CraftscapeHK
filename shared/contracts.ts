export interface LocalizedString {
  zh: string;
  en: string;
}

export type LocaleCode = keyof LocalizedString;
export type CurrencyCode = 'HKD';
export type LanguageCode = 'en' | 'zh' | 'yue';
/** Monetary amounts are always stored in the smallest currency unit, e.g. HKD cents. */
export type MoneyAmountCents = number;

export interface MoneyContract {
  amount: MoneyAmountCents;
  currency: CurrencyCode;
}

export type StripeCheckoutSessionStatus = 'open' | 'complete' | 'expired';
export type StripePaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

export enum EventType {
  Workshop = 'workshop',
  Exhibition = 'exhibition',
  Talk = 'talk',
}

export enum WorkshopScheduleStatus {
  Draft = 'draft',
  Open = 'open',
  Full = 'full',
  Cancelled = 'cancelled',
  Completed = 'completed',
}

export enum CapacityHoldStatus {
  Active = 'active',
  Expired = 'expired',
  Released = 'released',
  Converted = 'converted',
}

export enum CartItemType {
  Product = 'product',
  WorkshopSeat = 'workshop_seat',
  CoCreationDeposit = 'co_creation_deposit',
}

export enum BookingStatus {
  HoldPending = 'hold_pending',
  PendingPayment = 'pending_payment',
  Confirmed = 'confirmed',
  PaymentFailed = 'payment_failed',
  Cancelled = 'cancelled',
  Completed = 'completed',
}

export enum OrderStatus {
  PendingPayment = 'pending_payment',
  Paid = 'paid',
  InProduction = 'in_production',
  Ready = 'ready',
  Shipped = 'shipped',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

export enum PaymentStatus {
  NotRequired = 'not_required',
  PendingCheckout = 'pending_checkout',
  Processing = 'processing',
  Paid = 'paid',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

export enum CoCreationRequestStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  PendingArtisanReview = 'pending_artisan_review',
  ChangesRequested = 'changes_requested',
  Approved = 'approved',
  Rejected = 'rejected',
  ConvertedToOrder = 'converted_to_order',
  Cancelled = 'cancelled',
}

export enum ArtisanApprovalState {
  NotRequired = 'not_required',
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  ChangesRequested = 'changes_requested',
}

export enum MessageThreadContextType {
  Product = 'product',
  Workshop = 'workshop',
  Booking = 'booking',
  Order = 'order',
  CoCreationRequest = 'co_creation_request',
}

export enum MessageSenderRole {
  Customer = 'customer',
  Artisan = 'artisan',
  System = 'system',
}

export enum MessageType {
  Text = 'text',
  Image = 'image',
  System = 'system',
  PaymentUpdate = 'payment_update',
  ApprovalUpdate = 'approval_update',
}

export type TransitionMap<T extends string> = Record<T, readonly T[]>;

export const EVENT_TYPE_LABELS: Record<EventType, LocalizedString> = {
  [EventType.Workshop]: { zh: '工作坊', en: 'Workshop' },
  [EventType.Exhibition]: { zh: '展覽', en: 'Exhibition' },
  [EventType.Talk]: { zh: '講座', en: 'Talk' },
};

export const WORKSHOP_SCHEDULE_STATUS_LABELS: Record<WorkshopScheduleStatus, LocalizedString> = {
  [WorkshopScheduleStatus.Draft]: { zh: '草稿', en: 'Draft' },
  [WorkshopScheduleStatus.Open]: { zh: '開放報名', en: 'Open for booking' },
  [WorkshopScheduleStatus.Full]: { zh: '名額已滿', en: 'Full' },
  [WorkshopScheduleStatus.Cancelled]: { zh: '已取消', en: 'Cancelled' },
  [WorkshopScheduleStatus.Completed]: { zh: '已完成', en: 'Completed' },
};

export const CAPACITY_HOLD_STATUS_LABELS: Record<CapacityHoldStatus, LocalizedString> = {
  [CapacityHoldStatus.Active]: { zh: '名額暫留', en: 'Seat held' },
  [CapacityHoldStatus.Expired]: { zh: '暫留已過期', en: 'Hold expired' },
  [CapacityHoldStatus.Released]: { zh: '暫留已釋放', en: 'Hold released' },
  [CapacityHoldStatus.Converted]: { zh: '已確認名額', en: 'Converted to confirmed seat' },
};

export const CART_ITEM_TYPE_LABELS: Record<CartItemType, LocalizedString> = {
  [CartItemType.Product]: { zh: '產品', en: 'Product' },
  [CartItemType.WorkshopSeat]: { zh: '工作坊名額', en: 'Workshop seat' },
  [CartItemType.CoCreationDeposit]: { zh: '共創訂金', en: 'Co-creation deposit' },
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, LocalizedString> = {
  [BookingStatus.HoldPending]: { zh: '名額暫留中', en: 'Seat held temporarily' },
  [BookingStatus.PendingPayment]: { zh: '待付款', en: 'Pending payment' },
  [BookingStatus.Confirmed]: { zh: '工作坊名額已確認', en: 'Workshop seat confirmed' },
  [BookingStatus.PaymentFailed]: { zh: '付款失敗', en: 'Payment failed' },
  [BookingStatus.Cancelled]: { zh: '已取消', en: 'Cancelled' },
  [BookingStatus.Completed]: { zh: '工作坊已完成', en: 'Workshop completed' },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, LocalizedString> = {
  [OrderStatus.PendingPayment]: { zh: '待付款', en: 'Pending payment' },
  [OrderStatus.Paid]: { zh: '已付款', en: 'Payment received' },
  [OrderStatus.InProduction]: { zh: '製作中', en: 'In production' },
  [OrderStatus.Ready]: { zh: '可交付', en: 'Ready' },
  [OrderStatus.Shipped]: { zh: '已發貨', en: 'Shipped' },
  [OrderStatus.Completed]: { zh: '已完成', en: 'Completed' },
  [OrderStatus.Cancelled]: { zh: '已取消', en: 'Cancelled' },
  [OrderStatus.Refunded]: { zh: '已退款', en: 'Refunded' },
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, LocalizedString> = {
  [PaymentStatus.NotRequired]: { zh: '毋須付款', en: 'Payment not required' },
  [PaymentStatus.PendingCheckout]: { zh: '待進入付款', en: 'Pending checkout' },
  [PaymentStatus.Processing]: { zh: '付款處理中', en: 'Payment processing' },
  [PaymentStatus.Paid]: { zh: '付款成功', en: 'Paid' },
  [PaymentStatus.Failed]: { zh: '付款失敗', en: 'Payment failed' },
  [PaymentStatus.Cancelled]: { zh: '付款已取消', en: 'Payment cancelled' },
  [PaymentStatus.Refunded]: { zh: '已退款', en: 'Refunded' },
};

export const CO_CREATION_REQUEST_STATUS_LABELS: Record<CoCreationRequestStatus, LocalizedString> = {
  [CoCreationRequestStatus.Draft]: { zh: '草稿', en: 'Draft' },
  [CoCreationRequestStatus.Submitted]: { zh: '已提交', en: 'Submitted' },
  [CoCreationRequestStatus.PendingArtisanReview]: { zh: '待師傅審批', en: 'Pending artisan review' },
  [CoCreationRequestStatus.ChangesRequested]: { zh: '需要修改', en: 'Changes requested' },
  [CoCreationRequestStatus.Approved]: { zh: '師傅已批准', en: 'Approved by artisan' },
  [CoCreationRequestStatus.Rejected]: { zh: '師傅未能承接', en: 'Rejected by artisan' },
  [CoCreationRequestStatus.ConvertedToOrder]: { zh: '已轉為訂單', en: 'Converted to order' },
  [CoCreationRequestStatus.Cancelled]: { zh: '已取消', en: 'Cancelled' },
};

export const ARTISAN_APPROVAL_STATE_LABELS: Record<ArtisanApprovalState, LocalizedString> = {
  [ArtisanApprovalState.NotRequired]: { zh: '毋須審批', en: 'Approval not required' },
  [ArtisanApprovalState.Pending]: { zh: '待師傅審批', en: 'Pending artisan approval' },
  [ArtisanApprovalState.Approved]: { zh: '師傅已批准', en: 'Approved by artisan' },
  [ArtisanApprovalState.Rejected]: { zh: '師傅未能承接', en: 'Rejected by artisan' },
  [ArtisanApprovalState.ChangesRequested]: { zh: '師傅要求修改', en: 'Changes requested' },
};

export const MESSAGE_THREAD_CONTEXT_TYPE_LABELS: Record<MessageThreadContextType, LocalizedString> = {
  [MessageThreadContextType.Product]: { zh: '產品查詢', en: 'Product conversation' },
  [MessageThreadContextType.Workshop]: { zh: '工作坊查詢', en: 'Workshop conversation' },
  [MessageThreadContextType.Booking]: { zh: '工作坊預約', en: 'Booking conversation' },
  [MessageThreadContextType.Order]: { zh: '訂單', en: 'Order conversation' },
  [MessageThreadContextType.CoCreationRequest]: { zh: '共創申請', en: 'Co-creation conversation' },
};

export const MESSAGE_SENDER_ROLE_LABELS: Record<MessageSenderRole, LocalizedString> = {
  [MessageSenderRole.Customer]: { zh: '顧客', en: 'Customer' },
  [MessageSenderRole.Artisan]: { zh: '師傅', en: 'Artisan' },
  [MessageSenderRole.System]: { zh: '系統', en: 'System' },
};

export const MESSAGE_TYPE_LABELS: Record<MessageType, LocalizedString> = {
  [MessageType.Text]: { zh: '文字訊息', en: 'Text message' },
  [MessageType.Image]: { zh: '圖片', en: 'Image' },
  [MessageType.System]: { zh: '系統訊息', en: 'System message' },
  [MessageType.PaymentUpdate]: { zh: '付款更新', en: 'Payment update' },
  [MessageType.ApprovalUpdate]: { zh: '審批更新', en: 'Approval update' },
};

export const WORKSHOP_SCHEDULE_STATUS_TRANSITIONS: TransitionMap<WorkshopScheduleStatus> = {
  [WorkshopScheduleStatus.Draft]: [
    WorkshopScheduleStatus.Open,
    WorkshopScheduleStatus.Cancelled,
  ],
  [WorkshopScheduleStatus.Open]: [
    WorkshopScheduleStatus.Full,
    WorkshopScheduleStatus.Cancelled,
    WorkshopScheduleStatus.Completed,
  ],
  [WorkshopScheduleStatus.Full]: [
    WorkshopScheduleStatus.Open,
    WorkshopScheduleStatus.Cancelled,
    WorkshopScheduleStatus.Completed,
  ],
  [WorkshopScheduleStatus.Cancelled]: [],
  [WorkshopScheduleStatus.Completed]: [],
};

export const CAPACITY_HOLD_STATUS_TRANSITIONS: TransitionMap<CapacityHoldStatus> = {
  [CapacityHoldStatus.Active]: [
    CapacityHoldStatus.Expired,
    CapacityHoldStatus.Released,
    CapacityHoldStatus.Converted,
  ],
  [CapacityHoldStatus.Expired]: [],
  [CapacityHoldStatus.Released]: [],
  [CapacityHoldStatus.Converted]: [],
};

/**
 * Booking lifecycle:
 *
 * hold_pending -> pending_payment -> confirmed -> completed
 *       |               |                |
 *       v               v                v
 *   cancelled     payment_failed     cancelled
 */
export const BOOKING_STATUS_TRANSITIONS: TransitionMap<BookingStatus> = {
  [BookingStatus.HoldPending]: [BookingStatus.PendingPayment, BookingStatus.Cancelled],
  [BookingStatus.PendingPayment]: [
    BookingStatus.Confirmed,
    BookingStatus.PaymentFailed,
    BookingStatus.Cancelled,
  ],
  [BookingStatus.Confirmed]: [BookingStatus.Completed, BookingStatus.Cancelled],
  [BookingStatus.PaymentFailed]: [BookingStatus.PendingPayment, BookingStatus.Cancelled],
  [BookingStatus.Cancelled]: [],
  [BookingStatus.Completed]: [],
};

/**
 * Order lifecycle:
 *
 * pending_payment -> paid -> in_production -> ready -> shipped -> completed
 *        |            |          |           |  |        |
 *        v            v          v           |  v        v
 *    cancelled    refunded   cancelled      | cancelled refunded
 *                                           v
 *                                       completed
 */
export const ORDER_STATUS_TRANSITIONS: TransitionMap<OrderStatus> = {
  [OrderStatus.PendingPayment]: [OrderStatus.Paid, OrderStatus.Cancelled],
  [OrderStatus.Paid]: [OrderStatus.InProduction, OrderStatus.Refunded, OrderStatus.Cancelled],
  [OrderStatus.InProduction]: [OrderStatus.Ready, OrderStatus.Cancelled],
  [OrderStatus.Ready]: [OrderStatus.Shipped, OrderStatus.Completed, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [OrderStatus.Completed, OrderStatus.Refunded],
  [OrderStatus.Completed]: [OrderStatus.Refunded],
  [OrderStatus.Cancelled]: [],
  [OrderStatus.Refunded]: [],
};

/**
 * Payment lifecycle:
 *
 * not_required
 * pending_checkout -> processing -> paid -> refunded
 *         |              |
 *         v              v
 *     cancelled        failed
 */
export const PAYMENT_STATUS_TRANSITIONS: TransitionMap<PaymentStatus> = {
  [PaymentStatus.NotRequired]: [],
  [PaymentStatus.PendingCheckout]: [
    PaymentStatus.Processing,
    PaymentStatus.Paid,
    PaymentStatus.Failed,
    PaymentStatus.Cancelled,
  ],
  [PaymentStatus.Processing]: [PaymentStatus.Paid, PaymentStatus.Failed, PaymentStatus.Cancelled],
  [PaymentStatus.Paid]: [PaymentStatus.Refunded],
  [PaymentStatus.Failed]: [PaymentStatus.PendingCheckout, PaymentStatus.Cancelled],
  [PaymentStatus.Cancelled]: [],
  [PaymentStatus.Refunded]: [],
};

/**
 * Co-creation lifecycle:
 *
 * draft -> submitted -> pending_artisan_review -> approved -> converted_to_order
 *                         |          |
 *                         v          v
 *                 changes_requested rejected
 */
export const CO_CREATION_REQUEST_STATUS_TRANSITIONS: TransitionMap<CoCreationRequestStatus> = {
  [CoCreationRequestStatus.Draft]: [
    CoCreationRequestStatus.Submitted,
    CoCreationRequestStatus.Cancelled,
  ],
  [CoCreationRequestStatus.Submitted]: [
    CoCreationRequestStatus.PendingArtisanReview,
    CoCreationRequestStatus.Cancelled,
  ],
  [CoCreationRequestStatus.PendingArtisanReview]: [
    CoCreationRequestStatus.ChangesRequested,
    CoCreationRequestStatus.Approved,
    CoCreationRequestStatus.Rejected,
    CoCreationRequestStatus.Cancelled,
  ],
  [CoCreationRequestStatus.ChangesRequested]: [
    CoCreationRequestStatus.Submitted,
    CoCreationRequestStatus.Cancelled,
  ],
  [CoCreationRequestStatus.Approved]: [
    CoCreationRequestStatus.ConvertedToOrder,
    CoCreationRequestStatus.Cancelled,
  ],
  [CoCreationRequestStatus.Rejected]: [],
  [CoCreationRequestStatus.ConvertedToOrder]: [],
  [CoCreationRequestStatus.Cancelled]: [],
};

export const ARTISAN_APPROVAL_STATE_TRANSITIONS: TransitionMap<ArtisanApprovalState> = {
  [ArtisanApprovalState.NotRequired]: [],
  [ArtisanApprovalState.Pending]: [
    ArtisanApprovalState.Approved,
    ArtisanApprovalState.Rejected,
    ArtisanApprovalState.ChangesRequested,
  ],
  [ArtisanApprovalState.Approved]: [],
  [ArtisanApprovalState.Rejected]: [],
  [ArtisanApprovalState.ChangesRequested]: [ArtisanApprovalState.Pending],
};

export interface WorkshopCapacityInput {
  capacityTotal: number;
  confirmedSeats: number;
  activeHoldSeats: number;
}

export interface WorkshopCapacitySnapshot extends WorkshopCapacityInput {
  capacityAvailable: number;
}

export interface MvpEventContract {
  id: string;
  type: EventType;
  title: LocalizedString;
  description: LocalizedString;
  artisanId?: string;
  craftId?: string;
  imageUrl?: string;
}

export interface WorkshopScheduleContract {
  id: string;
  eventId: string;
  startsAt: string;
  endsAt: string;
  timezone: 'Asia/Hong_Kong';
  location: LocalizedString;
  status: WorkshopScheduleStatus;
  price: MoneyAmountCents;
  currency: CurrencyCode;
  capacity: WorkshopCapacitySnapshot;
}

export interface WorkshopCapacityHoldContract {
  id: string;
  scheduleId: string;
  customerId: string;
  quantity: number;
  status: CapacityHoldStatus;
  expiresAt: string;
  convertedBookingId?: string;
}

export interface ProductCartItemContract {
  type: CartItemType.Product;
  productId: string;
  quantity: number;
}

export interface WorkshopSeatCartItemContract {
  type: CartItemType.WorkshopSeat;
  eventId: string;
  scheduleId: string;
  quantity: number;
  holdId?: string;
}

export interface CoCreationDepositCartItemContract {
  type: CartItemType.CoCreationDeposit;
  coCreationRequestId: string;
  quantity: 1;
}

export type CartItemContract =
  | ProductCartItemContract
  | WorkshopSeatCartItemContract
  | CoCreationDepositCartItemContract;

export interface StripePaymentReferenceContract {
  stripeCheckoutSessionId?: string;
  stripeCheckoutSessionStatus?: StripeCheckoutSessionStatus;
  stripePaymentIntentId?: string;
  stripePaymentIntentStatus?: StripePaymentIntentStatus;
  stripeLatestEventId?: string;
}

/** Bookings are created only for workshop events with a concrete artisan owner. */
export interface BookingContract {
  id: string;
  customerId: string;
  artisanId: string;
  eventId: string;
  scheduleId: string;
  quantity: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  capacityHoldId?: string;
  orderId?: string;
  stripe?: StripePaymentReferenceContract;
}

export interface OrderItemContract {
  id: string;
  type: CartItemType;
  quantity: number;
  unitAmount: MoneyAmountCents;
  currency: CurrencyCode;
  productId?: string;
  bookingId?: string;
  coCreationRequestId?: string;
}

export interface OrderContract {
  id: string;
  customerId: string;
  artisanId?: string;
  items: OrderItemContract[];
  subtotal: MoneyAmountCents;
  total: MoneyAmountCents;
  currency: CurrencyCode;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  bookingIds?: string[];
  coCreationRequestId?: string;
  stripe?: StripePaymentReferenceContract;
}

export interface CoCreationRequestContract {
  id: string;
  customerId: string;
  artisanId: string;
  craftId: string;
  aiCreationId?: string;
  prompt: string;
  referenceImageUrls: string[];
  status: CoCreationRequestStatus;
  approvalState: ArtisanApprovalState;
  quote?: MoneyContract;
  deposit?: MoneyContract;
  convertedOrderId?: string;
}

export interface MessageThreadSummaryContract {
  id: string;
  customerId: string;
  artisanId: string;
  contextType: MessageThreadContextType;
  contextId: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatMessageContract {
  id: string;
  threadId: string;
  sequence: number;
  senderId: string;
  senderRole: MessageSenderRole;
  type: MessageType;
  originalText?: string;
  translatedText?: string;
  sourceLanguage?: LanguageCode;
  targetLanguage?: LanguageCode;
  attachmentUrls?: string[];
  clientMutationId?: string;
  createdAt: string;
}

export interface MessageReplayCursorContract {
  threadId: string;
  afterSequence?: number;
  limit: number;
}

export function getLocalizedLabel<TStatus extends string>(
  labels: Record<TStatus, LocalizedString>,
  status: TStatus,
  locale: LocaleCode,
): string {
  return labels[status]?.[locale] ?? status;
}

export function canTransition<TStatus extends string>(
  transitions: TransitionMap<TStatus>,
  from: TStatus,
  to: TStatus,
): boolean {
  return (transitions[from] ?? []).includes(to);
}

export function calculateWorkshopCapacityAvailable(input: WorkshopCapacityInput): number {
  return Math.max(input.capacityTotal - input.confirmedSeats - input.activeHoldSeats, 0);
}

export function toWorkshopCapacitySnapshot(input: WorkshopCapacityInput): WorkshopCapacitySnapshot {
  return {
    ...input,
    capacityAvailable: calculateWorkshopCapacityAvailable(input),
  };
}
