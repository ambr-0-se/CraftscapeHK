// Real HTTP API Service to replace mock backend/api.ts
import type {
    Craft,
    Product,
    Event,
    Order,
    Artisan,
    MessageThread,
    PendingWorkshopBookingResponse,
} from '../types';
import type { AiCreationContract, CoCreationRequestContract } from '../shared/contracts';
import type { BookingContract, BookingStatus, OrderStatus } from '../shared/contracts';
import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Helper function for making HTTP requests
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options?.headers as Record<string, string>,
        };

        // Add authentication token if available
        const token = authService.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            if (response.status === 401 && authService.isAuthenticated()) {
                // Token might be expired, logout user
                authService.logout();
                window.location.reload();
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error);
        const method = (options?.method || 'GET').toString().toUpperCase();
        // Fallback GET reads to local seed data when the backend is unavailable
        // or a running dev backend is older than this worktree's API surface.
        if (method === 'GET') {
            return fallbackToMockData<T>(endpoint);
        }
        throw error;
    }
}

// Fallback to constants.ts data when backend is unavailable
async function fallbackToMockData<T>(endpoint: string): Promise<T> {
    console.warn(`Falling back to mock data for ${endpoint}`);
    const url = new URL(endpoint, 'http://craftscape.local');
    const { pathname, searchParams } = url;
    
    // Dynamic import to avoid circular dependencies
    const { CRAFTS, PRODUCTS, EVENTS, ORDERS, ARTISANS, MESSAGE_THREADS } = await import('../constants');
    
    if (pathname === '/crafts') return CRAFTS as T;
    if (pathname === '/products') return PRODUCTS as T;
    if (pathname === '/events') return EVENTS as T;
    if (pathname === '/artisans') return ARTISANS as T;
    if (pathname === '/orders') {
        const customerId = searchParams.get('customerId');
        const artisanId = searchParams.get('artisanId');
        const orders = ORDERS.filter((order) => {
            if (customerId && order.customerId !== customerId) {
                return false;
            }
            if (artisanId) {
                const productArtisanId = order.product?.artisanId
                    ? `artisan-${order.product.artisanId}`
                    : null;
                if (productArtisanId !== artisanId) {
                    return false;
                }
            }
            return true;
        });
        return orders as T;
    }
    if (pathname === '/messages') {
        const customerId = searchParams.get('customerId');
        const artisanId = searchParams.get('artisanId');
        const threads = MESSAGE_THREADS.filter((thread) => {
            if (customerId && thread.customerId !== customerId) {
                return false;
            }
            if (artisanId && thread.artisanId !== artisanId) {
                return false;
            }
            return true;
        });
        return threads as T;
    }
    if (pathname === '/bookings') return [] as T;
    if (pathname === '/co-creation/concepts') return [] as T;
    if (pathname === '/co-creation/requests') return [] as T;
    
    throw new Error(`No fallback data available for ${endpoint}`);
}

// API Functions
export const getCrafts = async (): Promise<Craft[]> => {
    return apiRequest<Craft[]>('/crafts');
};

export const getProducts = async (): Promise<Product[]> => {
    const products = await apiRequest<Product[]>('/products');

    try {
        const { PRODUCTS } = await import('../constants');
        const remoteMap = new Map(products.map(product => [product.id, product]));

        return PRODUCTS.map(product => ({
            ...remoteMap.get(product.id),
            ...product,
        }));
    } catch (error) {
        console.warn('Failed to enrich products with local listing metadata:', error);
        return products;
    }
};

export const getEvents = async (): Promise<Event[]> => {
    return apiRequest<Event[]>('/events');
};

export const getOrders = async (filters?: {
    customerId?: string;
    artisanId?: string;
}): Promise<Order[]> => {
    const params = new URLSearchParams();
    if (filters?.customerId) {
        params.set('customerId', filters.customerId);
    }
    if (filters?.artisanId) {
        params.set('artisanId', filters.artisanId);
    }
    const query = params.toString();
    return apiRequest<Order[]>(`/orders${query ? `?${query}` : ''}`);
};

export const getArtisans = async (): Promise<Artisan[]> => {
    return apiRequest<Artisan[]>('/artisans');
};

export const getMessageThreads = async (filters?: {
    customerId?: string;
    artisanId?: string;
}): Promise<MessageThread[]> => {
    const params = new URLSearchParams();
    if (filters?.customerId) {
        params.set('customerId', filters.customerId);
    }
    if (filters?.artisanId) {
        params.set('artisanId', filters.artisanId);
    }
    const query = params.toString();
    const threads = await apiRequest<MessageThread[]>(`/messages${query ? `?${query}` : ''}`);

    try {
        const { MESSAGE_THREADS } = await import('../constants');
        const enrichedMap = new Map(MESSAGE_THREADS.map(thread => [thread.id, thread]));

        return threads.map(thread => {
            const enriched = enrichedMap.get(thread.id);
            if (!enriched || (thread.messages && thread.messages.length > 0)) {
                return {
                    ...thread,
                    lastMessage: thread.lastMessagePreview || thread.lastMessage,
                    timestamp: thread.timestamp,
                };
            }

            return {
                ...thread,
                lastMessage: thread.lastMessagePreview || enriched.lastMessage,
                timestamp: thread.timestamp || enriched.timestamp,
                avatar: thread.avatar || enriched.avatar,
                messages: thread.messages || enriched.messages,
            };
        });
    } catch (error) {
        console.warn('Failed to enrich message threads with local data:', error);
        return threads;
    }
};

export const createPendingWorkshopBooking = async (payload: {
    eventId: string;
    scheduleId: string;
    quantity: number;
    customerId?: string;
}): Promise<PendingWorkshopBookingResponse> => {
    return apiRequest<PendingWorkshopBookingResponse>('/bookings/workshops/pending', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const getBookings = async (filters?: {
    customerId?: string;
    artisanId?: string;
}): Promise<BookingContract[]> => {
    const params = new URLSearchParams();
    if (filters?.customerId) {
        params.set('customerId', filters.customerId);
    }
    if (filters?.artisanId) {
        params.set('artisanId', filters.artisanId);
    }
    const query = params.toString();
    return apiRequest<BookingContract[]>(`/bookings${query ? `?${query}` : ''}`);
};

export const updateOrderStatus = async (
    orderId: string,
    input: {
        status: OrderStatus;
        artisanId: string;
    },
): Promise<Order> => {
    return apiRequest<Order>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
};

export const updateBookingStatus = async (
    bookingId: string,
    input: {
        status: BookingStatus;
        artisanId: string;
    },
): Promise<BookingContract> => {
    return apiRequest<BookingContract>(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
};

/**
 * AI Image Generation API
 * This calls the backend endpoint that securely handles the AI API key
 */
export const generateCraftImageApi = async (
    craftName: string, 
    userPrompt: string,
    referenceImageUrl?: string
): Promise<string> => {
    try {
        const response = await apiRequest<{ imageUrl: string }>('/ai/generate-image', {
            method: 'POST',
            body: JSON.stringify({ craftName, userPrompt, referenceImageUrl }),
        });
        
        return response.imageUrl;
    } catch (error) {
        console.error('Failed to generate craft image:', error);
        throw new Error('Failed to generate image. Please try again later.');
    }
};

export const generateAndPersistAiConcept = async (
    craftId: string | number,
    craftName: { zh: string; en: string },
    userPrompt: string,
    referenceImageUrl?: string,
    customerId?: string,
): Promise<AiCreationContract> => {
    return apiRequest<AiCreationContract>('/co-creation/concepts/generate', {
        method: 'POST',
        body: JSON.stringify({
            craftId,
            craftName,
            userPrompt,
            referenceImageUrl,
            customerId,
        }),
    });
};

export const persistAiConcept = async (
    craftId: string | number,
    craftName: { zh: string; en: string },
    prompt: string,
    imageUrl: string,
    referenceImageUrls?: string[],
    customerId?: string,
): Promise<AiCreationContract> => {
    return apiRequest<AiCreationContract>('/co-creation/concepts', {
        method: 'POST',
        body: JSON.stringify({
            craftId,
            craftName,
            prompt,
            imageUrl,
            referenceImageUrls,
            customerId,
        }),
    });
};

export const getAiConcepts = async (customerId?: string): Promise<AiCreationContract[]> => {
    const params = new URLSearchParams();
    if (customerId) {
        params.set('customerId', customerId);
    }
    const query = params.toString();
    return apiRequest<AiCreationContract[]>(`/co-creation/concepts${query ? `?${query}` : ''}`);
};

export const submitCoCreationRequest = async (input: {
    aiCreationId?: string;
    craftId: string | number;
    prompt: string;
    referenceImageUrls: string[];
    customerName?: string;
    customerEmail?: string;
    customerMessage?: string;
    customerId?: string;
    artisanId?: string;
}): Promise<CoCreationRequestContract> => {
    return apiRequest<CoCreationRequestContract>('/co-creation/requests', {
        method: 'POST',
        body: JSON.stringify(input),
    });
};

export const getCoCreationRequests = async (filters?: {
    customerId?: string;
    artisanId?: string;
}): Promise<CoCreationRequestContract[]> => {
    const params = new URLSearchParams();
    if (filters?.customerId) {
        params.set('customerId', filters.customerId);
    }
    if (filters?.artisanId) {
        params.set('artisanId', filters.artisanId);
    }
    const query = params.toString();
    return apiRequest<CoCreationRequestContract[]>(`/co-creation/requests${query ? `?${query}` : ''}`);
};

export const applyCoCreationArtisanDecision = async (
    requestId: string,
    input: {
        decision: 'approve' | 'reject' | 'request_changes';
        artisanId?: string;
        artisanNote?: string;
        quoteAmountCents?: number;
        depositAmountCents?: number;
    }
): Promise<CoCreationRequestContract> => {
    return apiRequest<CoCreationRequestContract>(`/co-creation/requests/${requestId}/artisan-decision`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
};

/**
 * AI Try-On Image Generation API
 * This calls the backend endpoint for cheongsam try-on with face reference
 */
export const generateTryOnImageApi = async (
    craftName: string, 
    faceImageUrl: string, 
    userPrompt: string,
    existingCheongsamImageUrl?: string
): Promise<string> => {
    try {
        const response = await apiRequest<{ imageUrl: string }>('/ai/generate-tryon', {
            method: 'POST',
            body: JSON.stringify({ craftName, faceImageUrl, userPrompt, existingCheongsamImageUrl }),
        });
        
        return response.imageUrl;
    } catch (error) {
        console.error('Failed to generate try-on image:', error);
        throw new Error('Failed to generate try-on image. Please try again later.');
    }
};
