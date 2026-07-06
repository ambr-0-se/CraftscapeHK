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
import type {
    AiCreationContract,
    CheckoutSessionResultContract,
    CoCreationRequestContract,
    CreateCheckoutSessionInputContract,
    CustomerOrderHistoryEntryContract,
} from '../shared/contracts';
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
        const isPublicGet = method === 'GET' && !endpoint.includes('/orders') && !endpoint.includes('/messages') && !endpoint.includes('/ai/');
        // Fallback to mock data only for GET requests to public resources
        if (isPublicGet) {
            return fallbackToMockData<T>(endpoint);
        }
        throw error;
    }
}

// Fallback to constants.ts data when backend is unavailable
async function fallbackToMockData<T>(endpoint: string): Promise<T> {
    console.warn(`Falling back to mock data for ${endpoint}`);
    
    // Dynamic import to avoid circular dependencies
    const { CRAFTS, PRODUCTS, EVENTS, ORDERS, ARTISANS, MESSAGE_THREADS } = await import('../constants');
    
    if (endpoint === '/crafts') return CRAFTS as T;
    if (endpoint === '/products') return PRODUCTS as T;
    if (endpoint === '/events') return EVENTS as T;
    if (endpoint === '/orders') return ORDERS as T;
    if (endpoint === '/artisans') return ARTISANS as T;
    if (endpoint === '/messages') return MESSAGE_THREADS as T;
    
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

export const getOrders = async (): Promise<Order[]> => {
    return apiRequest<Order[]>('/orders');
};

export const getArtisans = async (): Promise<Artisan[]> => {
    return apiRequest<Artisan[]>('/artisans');
};

export const getMessageThreads = async (): Promise<MessageThread[]> => {
    const threads = await apiRequest<MessageThread[]>('/messages');

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

/**
 * Checkout & orders API (Objectives 8/9). Customer IDs stay parameterized so
 * the demo persona switcher (Lane B) can slot in without contract changes.
 */
export const DEMO_CUSTOMER_ID = 'customer-demo';

export const createCheckoutSession = async (
    input: CreateCheckoutSessionInputContract,
): Promise<CheckoutSessionResultContract> => {
    return apiRequest<CheckoutSessionResultContract>('/checkout/session', {
        method: 'POST',
        body: JSON.stringify({ customerId: DEMO_CUSTOMER_ID, ...input }),
    });
};

export const getCheckoutOrderHistory = async (
    customerId: string = DEMO_CUSTOMER_ID,
): Promise<CustomerOrderHistoryEntryContract[]> => {
    return apiRequest<CustomerOrderHistoryEntryContract[]>(
        `/checkout/orders?customerId=${encodeURIComponent(customerId)}`,
    );
};

export const getCheckoutOrder = async (
    orderId: string,
): Promise<CustomerOrderHistoryEntryContract> => {
    return apiRequest<CustomerOrderHistoryEntryContract>(
        `/checkout/orders/${encodeURIComponent(orderId)}`,
    );
};

export const cancelCheckoutOrder = async (
    orderId: string,
    customerId: string = DEMO_CUSTOMER_ID,
): Promise<CustomerOrderHistoryEntryContract> => {
    return apiRequest<CustomerOrderHistoryEntryContract>(
        `/checkout/orders/${encodeURIComponent(orderId)}/cancel`,
        {
            method: 'POST',
            body: JSON.stringify({ customerId }),
        },
    );
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
    referenceImageUrl?: string
): Promise<AiCreationContract> => {
    return apiRequest<AiCreationContract>('/co-creation/concepts/generate', {
        method: 'POST',
        body: JSON.stringify({
            craftId,
            craftName,
            userPrompt,
            referenceImageUrl,
        }),
    });
};

export const persistAiConcept = async (
    craftId: string | number,
    craftName: { zh: string; en: string },
    prompt: string,
    imageUrl: string,
    referenceImageUrls?: string[]
): Promise<AiCreationContract> => {
    return apiRequest<AiCreationContract>('/co-creation/concepts', {
        method: 'POST',
        body: JSON.stringify({
            craftId,
            craftName,
            prompt,
            imageUrl,
            referenceImageUrls,
        }),
    });
};

export const getAiConcepts = async (): Promise<AiCreationContract[]> => {
    return apiRequest<AiCreationContract[]>('/co-creation/concepts?customerId=customer-demo');
};

export const submitCoCreationRequest = async (input: {
    aiCreationId?: string;
    craftId: string | number;
    prompt: string;
    referenceImageUrls: string[];
    customerName?: string;
    customerEmail?: string;
    customerMessage?: string;
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
