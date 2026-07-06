import React, { useMemo, useState } from 'react';
import type { Event } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { createPendingWorkshopBooking } from '../services/apiService';
import {
  EventType,
  WorkshopScheduleStatus,
  type WorkshopScheduleContract,
} from '../shared/contracts';

interface EventDetailProps {
  event: Event;
  onClose: () => void;
}

type IconProps = {
  className?: string;
};

const CalendarIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 3v4M17 3v4M4.75 9.25h14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M6.75 5.25h10.5A2.75 2.75 0 0 1 20 8v9.25A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25V8a2.75 2.75 0 0 1 2.75-2.75Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 13h2.2M13.8 13H16M8 16h2.2M13.8 16H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const LocationIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 21s6.25-5.45 6.25-11.1A6.25 6.25 0 0 0 5.75 9.9C5.75 15.55 12 21 12 21Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 12.4a2.35 2.35 0 1 0 0-4.7 2.35 2.35 0 0 0 0 4.7Z" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const ChevronDownIcon: React.FC<IconProps> = ({ className = 'h-6 w-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const formatMoney = (amount: number, currency = 'HKD') =>
  new Intl.NumberFormat('en-HK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);

const formatScheduleRange = (schedule: WorkshopScheduleContract, language: 'zh' | 'en') => {
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

  return `${date} · ${startTime} - ${endTime}`;
};

const EventDetail: React.FC<EventDetailProps> = ({ event, onClose }) => {
  const { language, t } = useLanguage();
  const { addWorkshopSeats } = useCart();
  const schedules = event.schedules ?? [];
  const isWorkshop = event.eventType === EventType.Workshop || event.type === '工作坊';
  const firstOpenSchedule = schedules.find(
    (schedule) =>
      schedule.status === WorkshopScheduleStatus.Open &&
      schedule.capacity.capacityAvailable > 0,
  );
  const [selectedScheduleId, setSelectedScheduleId] = useState(firstOpenSchedule?.id ?? schedules[0]?.id ?? '');
  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId);
  const quantityMax = Math.max(selectedSchedule?.capacity.capacityAvailable ?? 1, 1);
  const [quantity, setQuantity] = useState(1);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [bookingError, setBookingError] = useState('');
  const seatCountLabel = quantity === 1 ? t('workshopSeatShort') : t('workshopSeatsShort');

  const selectedTotal = useMemo(
    () => (selectedSchedule ? selectedSchedule.price * quantity : 0),
    [quantity, selectedSchedule],
  );

  const getTranslatedRegion = (region: Event['region']) => {
    const map = { '港島': 'regionHK', '九龍': 'regionKLN', '新界': 'regionNT', '線上': 'regionOnline' };
    return t(map[region] as keyof typeof import('../locales/zh').zh);
  };

  const handleSelectSchedule = (schedule: WorkshopScheduleContract) => {
    setSelectedScheduleId(schedule.id);
    setQuantity(Math.min(quantity, Math.max(schedule.capacity.capacityAvailable, 1)));
    setBookingStatus('idle');
    setBookingError('');
  };

  const handleReserveSeats = async () => {
    if (!selectedSchedule) return;
    setBookingStatus('submitting');
    setBookingError('');

    try {
      await createPendingWorkshopBooking({
        eventId: String(event.id),
        scheduleId: selectedSchedule.id,
        quantity,
      });
      addWorkshopSeats({ event, schedule: selectedSchedule, quantity });
      setBookingStatus('success');
    } catch (error) {
      setBookingStatus('error');
      setBookingError(error instanceof Error ? error.message : t('workshopBookingError'));
    }
  };

  const renderNonWorkshopAction = () => (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg p-4 bg-[var(--color-surface)]/80 backdrop-blur-xl border-t border-[var(--color-border)]">
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-[var(--color-primary-accent)] text-white text-center font-bold py-4 px-6 rounded-xl transition-transform duration-300 hover:scale-[1.01]"
      >
        {t('eventDetailButton')}
      </a>
    </div>
  );

  return (
    <div className="h-full w-full bg-[var(--color-page-bg)]">
      <div className="overflow-y-auto max-h-full pb-32">
        <header className="relative h-60 overflow-hidden">
          <img src={event.image} alt={event.title[language]} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-page-bg)] via-[var(--color-page-bg)]/20 to-black/25"></div>
          <button
            onClick={onClose}
            className="absolute top-6 left-4 bg-black/25 p-2 rounded-full text-white backdrop-blur-md border border-white/20"
            aria-label={t('workshopBack')}
          >
            <ChevronDownIcon />
          </button>
          <div className="absolute bottom-0 left-0 p-5 w-full">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
              {event.title[language]}
            </h1>
            <p className="text-lg text-[var(--color-primary-accent)] font-semibold mt-1">
              {event.organizer}
            </p>
          </div>
        </header>

        <div className="p-5 space-y-5 text-[var(--color-text-primary)]">
          <section className="bg-[var(--color-surface)] px-4 py-3 rounded-2xl border border-[var(--color-border)] ios-shadow space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--color-text-red)]/10 text-[var(--color-text-red)]">
                <CalendarIcon />
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  {isWorkshop ? t('workshopDuration') : event.date}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {isWorkshop ? t('workshopMaterialsIncluded') : event.time[language]}
                </p>
              </div>
            </div>
            <div className="border-t border-[var(--color-border)]"></div>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--color-text-red)]/10 text-[var(--color-text-red)]">
                <LocationIcon />
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  {selectedSchedule?.location[language] ?? event.location[language]}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {getTranslatedRegion(event.region)}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              {t('eventDetailTitle')}
            </h2>
            <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
              {event.description[language]}
            </p>
          </section>

          {isWorkshop && (
            <>
              <section>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
                  {t('workshopChooseSession')}
                </h2>
                <div className="space-y-3">
                  {schedules.map((schedule) => {
                    const isOpen = schedule.status === WorkshopScheduleStatus.Open && schedule.capacity.capacityAvailable > 0;
                    const isSelected = schedule.id === selectedScheduleId;

                    return (
                      <div
                        key={schedule.id}
                        className={`rounded-2xl border bg-[var(--color-surface)] transition-all ${
                          isSelected
                            ? 'border-[var(--color-text-red)] shadow-[0_8px_24px_rgba(151,34,38,0.14)]'
                            : 'border-[var(--color-border)]'
                        } ${!isOpen ? 'opacity-55' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectSchedule(schedule)}
                          disabled={!isOpen}
                          className={`w-full p-4 text-left ${isOpen ? 'hover:bg-[var(--color-page-bg)]/65' : ''} rounded-2xl transition-colors`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-bold text-[var(--color-text-primary)]">
                                {formatScheduleRange(schedule, language)}
                              </p>
                              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                                {t('workshopCapacitySummary', {
                                  available: schedule.capacity.capacityAvailable,
                                  total: schedule.capacity.capacityTotal,
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-[var(--color-text-primary)]">
                                {formatMoney(schedule.price, schedule.currency)}
                              </p>
                              <span
                                className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                                  isSelected
                                    ? 'bg-[var(--color-text-red)]/10 text-[var(--color-text-red)]'
                                    : isOpen
                                      ? 'bg-[var(--color-primary-accent)]/10 text-[var(--color-primary-accent)]'
                                      : 'bg-[var(--color-border)]/20 text-[var(--color-text-secondary)]'
                                }`}
                              >
                                {isSelected ? t('workshopSelected') : isOpen ? t('workshopOpen') : t('workshopFull')}
                              </span>
                            </div>
                          </div>
                        </button>
                        {isSelected && isOpen && (
                          <div className="mx-4 mb-4 space-y-2 rounded-xl bg-[var(--color-page-bg)] px-3 py-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                  {t('workshopSeats')}
                                </p>
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                  {t('workshopQuantityHelp', { max: schedule.capacity.capacityAvailable })}
                                </p>
                              </div>
                              <div className="grid grid-cols-[38px_38px_38px] items-center rounded-full border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
                                <button
                                  type="button"
                                  onClick={() => setQuantity((current) => Math.max(current - 1, 1))}
                                  aria-label={t('workshopDecreaseSeats')}
                                  disabled={quantity <= 1 || bookingStatus === 'success'}
                                  className="h-10 flex items-center justify-center text-xl font-bold text-[var(--color-primary-accent)] disabled:opacity-35"
                                >
                                  -
                                </button>
                                <output className="text-center font-bold">{quantity}</output>
                                <button
                                  type="button"
                                  onClick={() => setQuantity((current) => Math.min(current + 1, quantityMax))}
                                  aria-label={t('workshopIncreaseSeats')}
                                  disabled={quantity >= quantityMax || bookingStatus === 'success'}
                                  className="h-10 flex items-center justify-center text-xl font-bold text-[var(--color-primary-accent)] disabled:opacity-35"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            {bookingStatus === 'success' && (
                              <p className="rounded-lg border border-[var(--color-success)]/25 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-[var(--color-text-primary)]">
                                {t('workshopCheckoutReady')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {bookingStatus === 'error' && (
                <section className="space-y-3">
                  <p className="rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-text-primary)]">
                    {bookingError || t('workshopBookingError')}
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {isWorkshop ? (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg p-3 bg-[var(--color-surface)]/88 backdrop-blur-xl border-t border-[var(--color-border)] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="min-w-[96px]">
              <span className="block text-xs text-[var(--color-text-secondary)]">
                {quantity} {seatCountLabel}
              </span>
              <strong className="block text-lg leading-tight text-[var(--color-text-primary)]">
                {formatMoney(selectedTotal, selectedSchedule?.currency)}
              </strong>
            </div>
            <button
              type="button"
              onClick={handleReserveSeats}
              disabled={
                !selectedSchedule ||
                selectedSchedule.capacity.capacityAvailable <= 0 ||
                bookingStatus === 'submitting' ||
                bookingStatus === 'success'
              }
              className={`h-[52px] flex-1 rounded-xl text-white font-bold disabled:opacity-55 ${
                bookingStatus === 'success' ? 'bg-[var(--color-primary-accent)]' : 'bg-[var(--color-button-cta)]'
              }`}
            >
              {bookingStatus === 'submitting'
                ? t('workshopReservingSeats')
                : bookingStatus === 'success'
                  ? t('workshopSeatsReserved')
                  : t('workshopReserveSeats')}
            </button>
          </div>
        </div>
      ) : (
        renderNonWorkshopAction()
      )}
    </div>
  );
};

export default EventDetail;
