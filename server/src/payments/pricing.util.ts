import type { MoneyContract } from '@craftscape/contracts';
import { Product } from '../entities/product.entity';

/**
 * Authoritative backend pricing: converts the stored decimal HKD price to
 * integer cents. Listing display strings are never used for charging.
 */
export function toHkdCents(amountInDollars: number | string): number {
  const numeric = typeof amountInDollars === 'string' ? Number(amountInDollars) : amountInDollars;
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100);
}

export function getProductMoney(product: Pick<Product, 'price'>): MoneyContract {
  return {
    amount: toHkdCents(product.price),
    currency: 'HKD',
  };
}
