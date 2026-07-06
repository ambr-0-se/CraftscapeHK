import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { CurrencyCode, OrderItemContract } from '@craftscape/contracts';

/**
 * Canonical MVP order record created by checkout, matching `OrderContract`.
 * Kept separate from the legacy seeded `orders` table so prototype artisan
 * surfaces keep working while checkout owns real order lifecycles.
 */
@Entity('checkout_orders')
export class CheckoutOrder {
  @PrimaryColumn()
  id: string;

  @Column()
  customerId: string;

  @Column({ nullable: true })
  artisanId?: string;

  @Column('json')
  items: OrderItemContract[];

  @Column()
  subtotal: number;

  @Column()
  total: number;

  @Column()
  currency: CurrencyCode;

  @Column()
  status: string;

  @Column()
  paymentStatus: string;

  @Column({ nullable: true })
  bookingId?: string;

  @Column({ nullable: true })
  coCreationRequestId?: string;

  @Column({ nullable: true })
  stripeCheckoutSessionId?: string;

  @Column({ nullable: true })
  stripePaymentIntentId?: string;

  @Column({ nullable: true })
  stripeLatestEventId?: string;

  @Column()
  createdAt: string;

  @Column()
  updatedAt: string;
}
