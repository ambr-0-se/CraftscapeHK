/**
 * Payment environment configuration. Secrets stay in env vars; nothing here
 * is ever shipped to the frontend bundle.
 *
 * - PAYMENTS_SIMULATED=true: checkout confirms immediately as if a Stripe
 *   webhook succeeded (dev/demo mode, per Confirmed Product Decisions).
 * - STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET: Stripe test-mode credentials.
 * - CHECKOUT_RETURN_BASE_URL: frontend origin for success/cancel redirects.
 */
export const isPaymentsSimulated = (): boolean =>
  process.env.PAYMENTS_SIMULATED === 'true';

export const getStripeSecretKey = (): string | undefined =>
  process.env.STRIPE_SECRET_KEY;

export const getStripeWebhookSecret = (): string | undefined =>
  process.env.STRIPE_WEBHOOK_SECRET;

export const getCheckoutReturnBaseUrl = (): string =>
  process.env.CHECKOUT_RETURN_BASE_URL || 'http://localhost:3000';
