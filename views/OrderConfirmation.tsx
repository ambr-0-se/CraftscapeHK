import React, { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  BOOKING_STATUS_LABELS,
  CartItemType,
  PAYMENT_STATUS_LABELS,
  PaymentStatus,
  formatMoneyDisplay,
  getLocalizedLabel,
  type CustomerOrderHistoryEntryContract,
  type OrderContract,
} from '../shared/contracts';
import { canRetryOrder, deriveCheckoutOutcome } from '../utils/checkout';

interface OrderConfirmationProps {
  entry: CustomerOrderHistoryEntryContract;
  /** Stripe return hint from the success/cancel URL, if any. */
  hint?: 'success' | 'cancelled';
  onViewOrders: () => void;
  onRetry: (order: OrderContract) => void;
  onCancelOrder: (order: OrderContract) => Promise<void>;
  onClose: () => void;
}

const SUCCESS_TITLE_KEYS = {
  [CartItemType.WorkshopSeat]: 'confirmationSuccessWorkshop',
  [CartItemType.Product]: 'confirmationSuccessProduct',
  [CartItemType.CoCreationDeposit]: 'confirmationSuccessCoCreation',
} as const;

const NEXT_STEP_KEYS = {
  [CartItemType.WorkshopSeat]: ['confirmationNextWorkshop1', 'confirmationNextWorkshop2'],
  [CartItemType.Product]: ['confirmationNextProduct1', 'confirmationNextProduct2'],
  [CartItemType.CoCreationDeposit]: ['confirmationNextCoCreation1', 'confirmationNextCoCreation2'],
} as const;

const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  entry,
  hint,
  onViewOrders,
  onRetry,
  onCancelOrder,
  onClose,
}) => {
  const { language, t } = useLanguage();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const order = entry.order;
  const item = order.items[0];
  const itemType = item?.type ?? CartItemType.Product;
  const outcome = useMemo(() => deriveCheckoutOutcome(entry, hint), [entry, hint]);
  const isSuccess = outcome === 'success';
  const retryAvailable = !isSuccess && outcome !== 'processing' && canRetryOrder(entry);
  const isWorkshop = itemType === CartItemType.WorkshopSeat;

  const title =
    outcome === 'success'
      ? t(SUCCESS_TITLE_KEYS[itemType])
      : outcome === 'failed'
        ? t('confirmationFailedTitle')
        : outcome === 'cancelled'
          ? t('confirmationCancelledTitle')
          : t('confirmationProcessingTitle');

  const note =
    outcome === 'failed'
      ? t('confirmationFailedNote')
      : outcome === 'cancelled' && retryAvailable
        ? t('confirmationCancelledNote')
        : outcome === 'processing'
          ? t('confirmationProcessingNote')
          : '';

  const sealClass =
    outcome === 'success'
      ? 'bg-[var(--color-success)]'
      : outcome === 'processing'
        ? 'bg-[var(--color-primary-accent)]'
        : outcome === 'failed'
          ? 'bg-[var(--color-error)]'
          : 'bg-[var(--color-text-secondary)]';

  const handleCancel = async () => {
    setIsCancelling(true);
    setCancelError('');
    try {
      await onCancelOrder(order);
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : t('checkoutError'));
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="h-full w-full bg-[var(--color-page-bg)]">
      <div className="overflow-y-auto max-h-full pb-44">
        <section className="px-6 pb-2 pt-12 text-center">
          <div
            className={`mx-auto mb-4 flex h-[74px] w-[74px] items-center justify-center rounded-full text-3xl text-white ${sealClass}`}
            aria-hidden="true"
          >
            {isSuccess ? '✓' : outcome === 'processing' ? '…' : '!'}
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{title}</h1>
          {note && <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{note}</p>}
        </section>

        <section className="mx-4 mt-3 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] ios-shadow">
          {item && (
            <div className="flex gap-3 border-b border-[var(--color-border)] p-4">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title?.[language] ?? ''}
                  className="h-[74px] w-[74px] flex-none rounded-xl object-cover"
                />
              )}
              <div className="min-w-0">
                <h2 className="font-bold leading-snug text-[var(--color-text-primary)]">
                  {item.title?.[language]}
                </h2>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {isWorkshop
                    ? `${t('checkoutSeatsLabel')} ${item.quantity}`
                    : t('profileOrdersQuantity', { count: item.quantity })}
                </p>
              </div>
            </div>
          )}
          <dl className="px-4 py-1 text-[15px]">
            <div className="flex justify-between border-b border-[var(--color-border)] py-2.5">
              <dt className="text-[var(--color-text-secondary)]">{t('confirmationPaymentLabel')}</dt>
              <dd>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    order.paymentStatus === PaymentStatus.Paid
                      ? 'bg-[var(--color-success)]/12 text-[var(--color-success)]'
                      : order.paymentStatus === PaymentStatus.Failed
                        ? 'bg-[var(--color-error)]/12 text-[var(--color-error)]'
                        : 'bg-[var(--color-border)]/30 text-[var(--color-text-secondary)]'
                  }`}
                >
                  {getLocalizedLabel(PAYMENT_STATUS_LABELS, order.paymentStatus, language)}
                </span>
              </dd>
            </div>
            {entry.booking && (
              <div className="flex justify-between border-b border-[var(--color-border)] py-2.5">
                <dt className="text-[var(--color-text-secondary)]">{t('confirmationBookingLabel')}</dt>
                <dd className="font-semibold">
                  {getLocalizedLabel(BOOKING_STATUS_LABELS, entry.booking.status, language)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-b border-[var(--color-border)] py-2.5">
              <dt className="text-[var(--color-text-secondary)]">
                {isSuccess ? t('confirmationPaidTotalLabel') : t('confirmationAmountDueLabel')}
              </dt>
              <dd className="text-lg font-bold">
                {formatMoneyDisplay(order.total, order.currency, language)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--color-text-secondary)]">{t('confirmationOrderLabel')}</dt>
              <dd className="text-xs font-medium text-[var(--color-text-secondary)]">
                {order.id.slice(0, 14)}…
              </dd>
            </div>
          </dl>
        </section>

        {isSuccess && (
          <>
            <h3 className="mx-4 mb-1 mt-5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {t('confirmationNextTitle')}
            </h3>
            <section className="mx-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <ol className="space-y-0">
                {[...NEXT_STEP_KEYS[itemType], 'confirmationNextTrack'].map((key, index, all) => (
                  <li
                    key={key}
                    className={`flex gap-3 py-2.5 text-sm text-[var(--color-text-primary)] ${
                      index < all.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                    }`}
                  >
                    <span className="mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[var(--color-primary-accent)]/10 text-xs font-bold text-[var(--color-primary-accent)]">
                      {index + 1}
                    </span>
                    <span>{t(key as Parameters<typeof t>[0])}</span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        {cancelError && (
          <p className="mx-4 mt-4 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-text-primary)]">
            {cancelError}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-lg -translate-x-1/2 border-t border-[var(--color-border)] bg-[var(--color-surface)]/92 p-4 backdrop-blur-xl">
        {retryAvailable ? (
          <>
            <button
              type="button"
              onClick={() => onRetry(order)}
              disabled={isCancelling}
              className="w-full rounded-full bg-[var(--color-button-cta)] py-4 text-center font-bold text-white disabled:opacity-55"
            >
              {t('confirmationRetryCta')}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="mt-2 w-full py-2 text-center font-bold text-[var(--color-primary-accent)] disabled:opacity-55"
            >
              {isWorkshop ? t('confirmationCancelBookingCta') : t('confirmationCancelOrderCta')}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onViewOrders}
              className="w-full rounded-full bg-[var(--color-primary-accent)] py-4 text-center font-bold text-white"
            >
              {t('confirmationViewOrders')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full py-2 text-center font-bold text-[var(--color-primary-accent)]"
            >
              {t('confirmationDone')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderConfirmation;
