import React, { useState, useEffect } from 'react';
import {
    applyCoCreationArtisanDecision,
    getCoCreationRequests,
    getOrders,
} from '../../services/apiService';
import type { Order, OrderStatus } from '../../types';
import type { CoCreationRequestContract, LocaleCode } from '../../shared/contracts';
import {
    CO_CREATION_REQUEST_STATUS_LABELS,
    CoCreationRequestStatus,
    getLocalizedLabel,
} from '../../shared/contracts';
import Spinner from '../../components/Spinner';
import { useLanguage } from '../../contexts/LanguageContext';

const getStatusColor = (status: OrderStatus) => {
    switch (status) {
        case '待處理': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
        case '已發貨': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
        case '已完成': return 'bg-green-500/20 text-green-700 dark:text-green-500';
        case '已取消': return 'bg-red-500/20 text-red-700 dark:text-red-500';
        default: return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
};

const OrderCard: React.FC<{ order: Order }> = ({ order }) => {
    const { language, t } = useLanguage();
    return (
        <div className="bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] ios-shadow">
            <div className="flex items-center justify-between gap-3">
                {/* Product Image - smaller */}
                <img src={order.product.image} alt={order.product.name[language]} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                
                {/* Order Info - condensed */}
                <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-[var(--color-text-primary)] truncate">{order.customerName}</p>
                        <div className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(order.status)}`}>
                            {order.status}
                        </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">{order.product.name[language]}</p>
                    <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-[var(--color-text-secondary)]">#{order.id} • {t('artisanOrdersQuantity', { quantity: order.quantity })}</span>
                        <span className="font-bold text-[var(--color-text-primary)]">{t('artisanOrdersTotal', { total: order.total })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
    const [requests, setRequests] = useState<CoCreationRequestContract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
    const { language, t } = useLanguage();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [ordersData, requestsData] = await Promise.all([
                    getOrders(),
                    getCoCreationRequests(),
                ]);
                setOrders(ordersData);
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
    }, [t]);

    const handleDecision = async (
        requestId: string,
        decision: 'approve' | 'reject' | 'request_changes',
    ) => {
        setUpdatingRequestId(requestId);
        setRequestError(null);
        try {
            const updated = await applyCoCreationArtisanDecision(requestId, {
                decision,
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

    return (
        <div className="h-full w-full flex flex-col bg-[var(--color-bg)] overflow-y-auto">
            <header className="p-6 pt-10">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{t('artisanOrdersTitle')}</h1>
                <p className="text-[17px] text-[var(--color-text-secondary)]">{t('artisanOrdersDesc')}</p>
            </header>

            <div className="flex-grow p-6 space-y-2 pb-24">
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
                            {orders.map(order => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default OrderManagement;
