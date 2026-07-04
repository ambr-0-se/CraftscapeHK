import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import type { CurrencyCode, WorkshopScheduleContract } from '@craftscape/contracts';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  eventType?: string;

  @Column('json')
  title: { zh: string; en: string };

  @Column()
  date: string;

  @Column('json')
  time: { zh: string; en: string };

  @Column('json')
  location: { zh: string; en: string };

  @Column('json')
  description: { zh: string; en: string };

  @Column()
  organizer: string;

  @Column()
  organizer_icon: string;

  @Column()
  image: string;

  @Column()
  region: string;

  @Column()
  type: string;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ nullable: true })
  artisanId?: string;

  @Column({ nullable: true })
  craftId?: string;

  @Column({ nullable: true })
  price?: number;

  @Column({ nullable: true })
  currency?: CurrencyCode;

  @Column('json', { nullable: true })
  schedules?: WorkshopScheduleContract[];

  @Column({ nullable: true })
  url?: string;
}
