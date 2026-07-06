import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';

/**
 * Stripe webhook receiver. The route is mounted with `express.raw()` in
 * `main.ts` so the request body reaches signature verification unparsed.
 */
@Controller('api/payments')
export class StripeWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe/webhook')
  async handleWebhook(
    @Req() request: Request,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(JSON.stringify(request.body ?? {}));
    return this.paymentsService.handleStripeWebhook(rawBody, signature);
  }
}
