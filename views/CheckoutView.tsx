import React, { useMemo, useState } from 'react';
import type { CheckoutIntent } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { createCheckoutSession } from '../services/apiService';
import {
  CART_ITEM_TYPE_LABELS,
  CartItemType,
  formatMoneyDisplay,
  getLocalizedLabel,
  type CheckoutSessionResultContract,
} from '../shared/contracts';
import { deriveCheckoutLine, formatScheduleRange } from '../utils/checkout';

interface CheckoutViewProps {
  intent: CheckoutIntent;
  onClose: () => void;
  onComplete: (result: CheckoutSessionResultContract) => void;
}

const BEFORE_PAY_NOTE_KEYS = {
  [CartItemType.WorkshopSeat]: 'checkoutBeforePayWorkshop',
  [CartItemType.Product]: 'checkoutBeforePayProduct',
  [CartItemType.CoCreationDeposit]: 'checkoutBeforePayCoCreation',
} as const;

const CheckoutView: React.FC<CheckoutViewProps> = ({ intent, onClose, onComplete }) => {
  const { language, t } = useLanguage();
  const line = useMemo(() => deriveCheckoutLine(intent), [intent]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const total = line.unitAmount * line.quantity;
  const totalDisplay = formatMoneyDisplay(total, line.currency, language);
  const isWorkshop = line.itemType === CartItemType.WorkshopSeat;
  const isDeposit = line.itemType === CartItemType.CoCreationDeposit;

  const handlePay = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await createCheckoutSession({
        item: line.item,
        orderId: line.orderId,
      });
      if (result.mode === 'stripe' && result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      onComplete(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('checkoutError'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full bg-[var(--color-page-bg)]">
      <div className="overflow-y-auto max-h-full pb-44">
        <header className="flex items-center gap-3 px-4 pt-6 pb-2">
          <button
            onClick={onClose}
            aria-label={t('checkoutCancelCta')}
            className="h-10 w-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-lg text-[var(--color-text-primary)]"
          >
            ↓
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
              {t('checkoutTitle')}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">{t('checkoutSubtitle')}</p>
          </div>
        </header>

        <section className="mx-4 mt-3 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] ios-shadow">
          <div className="flex gap-3 border-b border-[var(--color-border)] p-4">
            {line.imageUrl && (
              <img
                src={line.imageUrl}
                alt={line.title[language]}
                className="h-[74px] w-[74px] flex-none rounded-xl object-cover"
              />
            )}
            <div className="min-w-0">
              <h2 className="font-bold leading-snug text-[var(--color-text-primary)]">
                {line.title[language]}
              </h2>
              {line.schedule && (
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {formatScheduleRange(line.schedule, language)} ·{' '}
                  {line.schedule.location[language]}
                </p>
              )}
              <span className="mt-2 inline-block rounded-full bg-[var(--color-primary-accent)]/10 px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-primary-accent)]">
                {getLocalizedLabel(CART_ITEM_TYPE_LABELS, line.itemType, language)}
              </span>
            </div>
          </div>
          <dl className="px-4 py-1 text-[15px]">
            <div className="flex justify-between border-b border-[var(--color-border)] py-2.5">
              <dt className="text-[var(--color-text-secondary)]">
                {isWorkshop ? t('checkoutSeatsLabel') : t('checkoutQuantityLabel')}
              </dt>
              <dd className="font-semibold">{line.quantity}</dd>
            </div>
            {line.quote && (
              <div className="flex justify-between border-b border-[var(--color-border)] py-2.5">
                <dt className="text-[var(--color-text-secondary)]">{t('checkoutQuoteLabel')}</dt>
                <dd className="font-semibold">
                  {formatMoneyDisplay(line.quote.amount, line.quote.currency, language)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-b border-[var(--color-border)] py-2.5">
              <dt className="text-[var(--color-text-secondary)]">
                {isDeposit ? t('checkoutDepositLabel') : t('checkoutUnitPriceLabel')}
              </dt>
              <dd className="font-semibold">
                {formatMoneyDisplay(line.unitAmount, line.currency, language)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[var(--color-text-secondary)]">{t('checkoutTotalLabel')}</dt>
              <dd className="text-lg font-bold">{totalDisplay}</dd>
            </div>
          </dl>
        </section>

        <h3 className="mx-4 mb-1 mt-5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {t('checkoutBeforePayTitle')}
        </h3>
        <section className="mx-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
          {t(BEFORE_PAY_NOTE_KEYS[line.itemType])}
        </section>

        {errorMessage && (
          <p className="mx-4 mt-4 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-text-primary)]">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-lg -translate-x-1/2 border-t border-[var(--color-border)] bg-[var(--color-surface)]/92 p-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={handlePay}
          disabled={isSubmitting || total <= 0}
          className="w-full rounded-full bg-[var(--color-button-cta)] py-4 text-center font-bold text-white disabled:opacity-55"
        >
          {isSubmitting ? t('checkoutProcessingCta') : t('checkoutPayCta', { amount: totalDisplay })}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="mt-2 w-full py-2 text-center font-bold text-[var(--color-primary-accent)] disabled:opacity-55"
        >
          {t('checkoutCancelCta')}
        </button>
        <p className="mt-1 text-center text-xs text-[var(--color-text-secondary)]">
          🔒 {t('checkoutSecureNote')}
        </p>
      </div>
    </div>
  );
};

export default CheckoutView;
