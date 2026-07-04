import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { CurrencyCode } from '@craftscape/contracts';

@Entity('bookings')
export class Booking {
  @PrimaryColumn()
  id: string;

  @Column()
  customerId: string;

  @Column()
  artisanId: string;

  @Column()
  eventId: string;

  @Column()
  scheduleId: string;

  @Column()
  quantity: number;

  @Column()
  status: string;

  @Column()
  paymentStatus: string;

  @Column({ nullable: true })
  capacityHoldId?: string;

  @Column({ nullable: true })
  orderId?: string;

  @Column()
  unitAmount: number;

  @Column()
  currency: CurrencyCode;

  @Column({ type: 'datetime' })
  createdAt: string;
}
