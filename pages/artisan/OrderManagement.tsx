import React, { useState, useEffect } from 'react';
import {
    applyCoCreationArtisanDecision,
    getBookings,
    getCoCreationRequests,
    getOrders,
    updateBookingStatus,
    updateOrderStatus,
} from '../../services/apiService';
import type { Order, OrderStatus } from '../../types';
import type { BookingContract, CoCreationRequestContract, LocaleCode } from '../../shared/contracts';
import {
    BOOKING_STATUS_LABELS,
    BOOKING_STATUS_TRANSITIONS,
    BookingStatus,
    CO_CREATION_REQUEST_STATUS_LABELS,
    CoCreationRequestStatus,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_TRANSITIONS,
    OrderStatus as ContractOrderStatus,
    getLocalizedLabel,
} from '../../shared/contracts';
import Spinner from '../../components/Spinner';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDemoPersona } from '../../contexts/DemoPersonaContext';

const getStatusColor = (status: OrderStatus) => {
    switch (status) {
        case '待處理':
        case ContractOrderStatus.Paid:
        case ContractOrderStatus.InProduction:
            return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
        case '已發貨':
        case ContractOrderStatus.Ready:
        case ContractOrderStatus.Shipped:
            return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
        case '已完成':
        case ContractOrderStatus.Completed:
            return 'bg-green-500/20 text-green-700 dark:text-green-500';
        case '已取消':
        case ContractOrderStatus.Cancelled:
        case ContractOrderStatus.Refunded:
            return 'bg-red-500/20 text-red-700 dark:text-red-500';
        default: return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
};

const toContractOrderStatus = (status: OrderStatus): ContractOrderStatus => {
    switch (status) {
        case '待處理':
            return ContractOrderStatus.Paid;
        case '已發貨':
            return ContractOrderStatus.Shipped;
        case '已完成':
            return ContractOrderStatus.Completed;
        case '已取消':
            return ContractOrderStatus.Cancelled;
        default:
            return status as ContractOrderStatus;
    }
};

const OrderCard: React.FC<{
    order: Order;
    locale: LocaleCode;
    onUpdateStatus: (orderId: string, status: ContractOrderStatus) => void;
    isUpdating: boolean;
}> = ({ order, locale, onUpdateStatus, isUpdating }) => {
    const { language, t } = useLanguage();
    const contractStatus = toContractOrderStatus(order.status);
    const nextStatuses = ORDER_STATUS_TRANSITIONS[contractStatus] ?? [];
    const statusLabel = ORDER_STATUS_LABELS[contractStatus]?.[locale] ?? order.status;
    return (
        <div className="bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] ios-shadow space-y-3">
            <div className="flex items-center justify-between gap-3">
                {/* Product Image - smaller */}
                <img src={order.product.image} alt={order.product.name[language]} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                
                {/* Order Info - condensed */}
                <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-[var(--color-text-primary)] truncate">{order.customerName}</p>
                        <div className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(order.status)}`}>
                            {statusLabel}
                        </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">{order.product.name[language]}</p>
                    <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-[var(--color-text-secondary)]">#{order.id} • {t('artisanOrdersQuantity', { quantity: order.quantity })}</span>
                        <span className="font-bold text-[var(--color-text-primary)]">{t('artisanOrdersTotal', { total: order.total })}</span>
                    </div>
                </div>
            </div>
            {nextStatuses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((status) => (
                        <button
                            key={status}
                            onClick={() => onUpdateStatus(order.id, status)}
                            disabled={isUpdating}
                            className="rounded-full border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-primary-accent)] disabled:opacity-50"
                        >
                            {ORDER_STATUS_LABELS[status][locale]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const BookingCard: React.FC<{
    booking: BookingContract;
    locale: LocaleCode;
    onUpdateStatus: (bookingId: string, status: BookingStatus) => void;
    isUpdating: boolean;
}> = ({ booking, locale, onUpdateStatus, isUpdating }) => {
    const nextStatuses = BOOKING_STATUS_TRANSITIONS[booking.status] ?? [];

    return (
        <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] ios-shadow space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-bold text-sm text-[var(--color-text-primary)]">
                        #{booking.id}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                        Workshop {booking.eventId} • Schedule {booking.scheduleId} • {booking.quantity} seat{booking.quantity === 1 ? '' : 's'}
                    </p>
                </div>
                <span className="rounded-full bg-[var(--color-primary-accent)]/10 px-2 py-1 text-[11px] font-semibold text-[var(--color-primary-accent)]">
                    {BOOKING_STATUS_LABELS[booking.status][locale]}
                </span>
            </div>
            {nextStatuses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((status) => (
                        <button
                            key={status}
                            onClick={() => onUpdateStatus(booking.id, status)}
                            disabled={isUpdating}
                            className="rounded-full border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-primary-accent)] disabled:opacity-50"
                        >
                            {BOOKING_STATUS_LABELS[status][locale]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const formatMoney = (amount: { amount: number; currency: 'HKD' } | undefined, fallback: string) => {
    if (!amount) {
        return fallback;
    }
    return `HK$ ${(amount.amount / 100).toLocaleString()}`;
};

const getRequestStatusClass = (status: CoCreationRequestContract['status']) => {
    switch (status) {
        case CoCreationRequestStatus.Approved:
            return 'bg-green-500/15 text-green-700 dark:text-green-400';
        case CoCreationRequestStatus.Rejected:
            return 'bg-red-500/15 text-red-700 dark:text-red-400';
        case CoCreationRequestStatus.ChangesRequested:
            return 'bg-[var(--color-button-cta)]/10 text-[var(--color-button-cta)]';
        default:
            return 'bg-[var(--color-primary-accent)]/10 text-[var(--color-primary-accent)]';
    }
};

const CoCreationRequestCard: React.FC<{
    request: CoCreationRequestContract;
    locale: LocaleCode;
    onDecision: (
        requestId: string,
        decision: 'approve' | 'reject' | 'request_changes',
    ) => void;
    isUpdating: boolean;
    t: ReturnType<typeof useLanguage>['t'];
}> = ({ request, locale, onDecision, isUpdating, t }) => {
    const statusLabel = getLocalizedLabel(
        CO_CREATION_REQUEST_STATUS_LABELS,
        request.status,
        locale,
    );
    const previewImage = request.referenceImageUrls[0];
    const isPending = request.status === CoCreationRequestStatus.PendingArtisanReview;

    return (
        <div className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] ios-shadow space-y-3">
            <div className="flex items-start gap-3">
                {previewImage ? (
                    <img
                        src={previewImage}
                        alt={t('artisanCoCreationImageAlt')}
                        className="h-20 w-20 rounded-xl object-cover border border-[var(--color-border)]"
                    />
                ) : (
                    <div className="h-20 w-20 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]" />
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm text-[var(--color-text-primary)]">
                            {t('artisanCoCreationCardTitle')}
                        </p>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getRequestStatusClass(request.status)}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <p className="mt-1 max-h-10 overflow-hidden text-xs text-[var(--color-text-secondary)]">
                        {request.prompt}
                    </p>
                </div>
            </div>

            {request.artisanNote && (
                <p className="rounded-xl bg-[var(--color-bg)] p-3 text-xs text-[var(--color-text-secondary)]">
                    {request.artisanNote}
                </p>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-[var(--color-bg)] p-3">
                    <p className="text-[var(--color-text-secondary)]">{t('artisanCoCreationQuote')}</p>
                    <p className="font-bold text-[var(--color-text-primary)]">
                        {formatMoney(request.quote, t('artisanCoCreationQuotePending'))}
                    </p>
                </div>
                <div className="rounded-xl bg-[var(--color-bg)] p-3">
                    <p className="text-[var(--color-text-secondary)]">{t('artisanCoCreationDeposit')}</p>
                    <p className="font-bold text-[var(--color-text-primary)]">
                        {formatMoney(request.deposit, t('artisanCoCreationQuotePending'))}
                    </p>
                </div>
            </div>

            {isPending ? (
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => onDecision(request.id, 'approve')}
                        disabled={isUpdating}
                        className="rounded-full bg-[var(--color-button-cta)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                        {t('artisanCoCreationApprove')}
                    </button>
                    <button
                        onClick={() => onDecision(request.id, 'request_changes')}
                        disabled={isUpdating}
                        className="rounded-full border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-primary-accent)] disabled:opacity-50"
                    >
                        {t('artisanCoCreationChanges')}
                    </button>
                    <button
                        onClick={() => onDecision(request.id, 'reject')}
                        disabled={isUpdating}
                        className="rounded-full border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-button-cta)] disabled:opacity-50"
                    >
                        {t('artisanCoCreationReject')}
                    </button>
                </div>
            ) : request.status === CoCreationRequestStatus.Approved ? (
                <p className="rounded-xl bg-[var(--color-success)]/10 p-3 text-xs font-medium text-[var(--color-success)]">
                    {t('artisanCoCreationApprovedReady')}
                </p>
            ) : null}
        </div>
    );
};

const OrderManagement: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [bookings, setBookings] = useState<BookingContract[]>([]);
    const [requests, setRequests] = useState<CoCreationRequestContract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
    const { language, t } = useLanguage();
    const { activeArtisanId } = useDemoPersona();

    useEffect(() => {
        if (!activeArtisanId) {
            setIsLoading(false);
            setOrders([]);
            setBookings([]);
            setRequests([]);
            return;
        }
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [ordersData, bookingsData, requestsData] = await Promise.all([
                    getOrders({ artisanId: activeArtisanId }),
                    getBookings({ artisanId: activeArtisanId }),
                    getCoCreationRequests({ artisanId: activeArtisanId }),
                ]);
                setOrders(ordersData);
                setBookings(bookingsData);
                setRequests(requestsData);
                setRequestError(null);
            } catch (error) {
                console.error(error);
                setRequestError(t('artisanCoCreationLoadError'));
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [activeArtisanId, t]);

    const handleDecision = async (
        requestId: string,
        decision: 'approve' | 'reject' | 'request_changes',
    ) => {
        if (!activeArtisanId) {
            return;
        }
        setUpdatingRequestId(requestId);
        setRequestError(null);
        try {
            const updated = await applyCoCreationArtisanDecision(requestId, {
                decision,
                artisanId: activeArtisanId,
                artisanNote:
                    decision === 'approve'
                        ? t('artisanCoCreationApprovedNote')
                        : decision === 'request_changes'
                        ? t('artisanCoCreationChangesNote')
                        : t('artisanCoCreationRejectedNote'),
                quoteAmountCents: 680000,
                depositAmountCents: 150000,
            });
            setRequests((current) =>
                current.map((request) => (request.id === updated.id ? updated : request)),
            );
        } catch (error) {
            console.error(error);
            setRequestError(t('artisanCoCreationUpdateError'));
        } finally {
            setUpdatingRequestId(null);
        }
    };

    const handleOrderStatus = async (orderId: string, status: ContractOrderStatus) => {
        if (!activeArtisanId) {
            return;
        }
        setUpdatingOrderId(orderId);
        setRequestError(null);
        try {
            const updated = await updateOrderStatus(orderId, {
                status,
                artisanId: activeArtisanId,
            });
            setOrders((current) =>
                current.map((order) => (order.id === updated.id ? updated : order)),
            );
        } catch (error) {
            console.error(error);
            setRequestError(language === 'zh' ? '未能更新訂單狀態。' : 'Unable to update order status.');
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const handleBookingStatus = async (bookingId: string, status: BookingStatus) => {
        if (!activeArtisanId) {
            return;
        }
        setUpdatingBookingId(bookingId);
        setRequestError(null);
        try {
            const updated = await updateBookingStatus(bookingId, {
                status,
                artisanId: activeArtisanId,
            });
            setBookings((current) =>
                current.map((booking) => (booking.id === updated.id ? updated : booking)),
            );
        } catch (error) {
            console.error(error);
            setRequestError(language === 'zh' ? '未能更新預約狀態。' : 'Unable to update booking status.');
        } finally {
            setUpdatingBookingId(null);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-[var(--color-bg)] overflow-y-auto">
            <header className="p-6 pt-10">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{t('artisanOrdersTitle')}</h1>
                <p className="text-[17px] text-[var(--color-text-secondary)]">{t('artisanOrdersDesc')}</p>
            </header>

            <div className="flex-grow p-6 space-y-2 pb-24">
                {!activeArtisanId && (
                    <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
                        {language === 'zh' ? '請先在個人頁選擇工藝師身份。' : 'Choose an artisan identity in Profile before managing orders.'}
                    </p>
                )}
                {isLoading ? <Spinner text={t('spinnerOrders')} /> : (
                    <>
                        <section className="space-y-3 pb-5">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                                    {t('artisanCoCreationTitle')}
                                </h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    {t('artisanCoCreationDesc')}
                                </p>
                            </div>
                            {requestError && (
                                <p className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
                                    {requestError}
                                </p>
                            )}
                            {requests.length > 0 ? (
                                requests.map((request) => (
                                    <CoCreationRequestCard
                                        key={request.id}
                                        request={request}
                                        locale={language}
                                        onDecision={handleDecision}
                                        isUpdating={updatingRequestId === request.id}
                                        t={t}
                                    />
                                ))
                            ) : (
                                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
                                    {t('artisanCoCreationEmpty')}
                                </p>
                            )}
                        </section>

                        <section className="space-y-2">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                                    {t('artisanCoCreationOrdersTitle')}
                                </h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    {t('artisanCoCreationOrdersDesc')}
                                </p>
                            </div>
                            {orders.length > 0 ? orders.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    locale={language}
                                    onUpdateStatus={handleOrderStatus}
                                    isUpdating={updatingOrderId === order.id}
                                />
                            )) : (
                                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
                                    {language === 'zh' ? '此工藝師暫時沒有產品訂單。' : 'This artisan has no product orders yet.'}
                                </p>
                            )}
                        </section>

                        <section className="space-y-2 pt-5">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                                    {language === 'zh' ? '工作坊預約' : 'Workshop bookings'}
                                </h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    {language === 'zh' ? '按合約狀態轉換更新預約。' : 'Move bookings through the shared status lifecycle.'}
                                </p>
                            </div>
                            {bookings.length > 0 ? bookings.map((booking) => (
                                <BookingCard
                                    key={booking.id}
                                    booking={booking}
                                    locale={language}
                                    onUpdateStatus={handleBookingStatus}
                                    isUpdating={updatingBookingId === booking.id}
                                />
                            )) : (
                                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
                                    {language === 'zh' ? '此工藝師暫時沒有工作坊預約。' : 'This artisan has no workshop bookings yet.'}
                                </p>
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default OrderManagement;
