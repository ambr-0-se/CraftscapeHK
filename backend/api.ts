// @/backend/api.ts

// Note: This mock backend is no longer used in production.
// All API calls go through the NestJS backend server.
// This file is kept for local development and testing only.

import { CRAFTS, PRODUCTS, EVENTS, ORDERS, ARTISANS, MESSAGE_THREADS } from '../constants';
import type { Craft, Product, Event, Order, Artisan, MessageThread } from '../types';

// --- Helper to simulate network delay ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const SIMULATED_DELAY = 500; // 500ms delay


// --- Mock API Endpoints ---

export const getCrafts = async (): Promise<Craft[]> => {
    await sleep(SIMULATED_DELAY);
    return CRAFTS;
};

export const getProducts = async (): Promise<Product[]> => {
    await sleep(SIMULATED_DELAY);
    return PRODUCTS;
};

export const getEvents = async (): Promise<Event[]> => {
    await sleep(SIMULATED_DELAY);
    return EVENTS;
};

export const getOrders = async (): Promise<Order[]> => {
    await sleep(SIMULATED_DELAY);
    // In a real API, this join would be done with a database query.
    return ORDERS.map(order => ({
        ...order,
        product: PRODUCTS.find(p => p.id === order.product.id)!
    }));
};

export const getArtisans = async (): Promise<Artisan[]> => {
    await sleep(SIMULATED_DELAY);
    return ARTISANS;
}

export const getMessageThreads = async (): Promise<MessageThread[]> => {
    await sleep(SIMULATED_DELAY);
    return MESSAGE_THREADS;
}

/**
 * DEPRECATED: This mock function is no longer used.
 * AI image generation now happens through the NestJS backend at /api/ai/generate-image
 * @deprecated Use apiService.generateCraftImageApi() instead
 */
export const generateCraftImageApi = async (craftName: string, userPrompt: string): Promise<string> => {
  throw new Error('This mock function is deprecated. Use the real backend API through apiService.generateCraftImageApi()');
};