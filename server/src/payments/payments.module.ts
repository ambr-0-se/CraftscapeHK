import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../entities/booking.entity';
import { CheckoutOrder } from '../entities/checkout-order.entity';
import { CoCreationRequest } from '../entities/co-creation-request.entity';
import { Event } from '../entities/event.entity';
import { Product } from '../entities/product.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckoutOrder, Booking, Event, Product, CoCreationRequest]),
  ],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
