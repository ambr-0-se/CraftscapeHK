import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Artisan } from './artisan.entity';
import { AiCreation } from './ai-creation.entity';

@Entity('co_creation_requests')
export class CoCreationRequest {
  @PrimaryColumn()
  id: string;

  @Column()
  customerId: string;

  @Column()
  artisanId: string;

  @Column()
  craftId: string;

  @Column({ nullable: true })
  aiCreationId?: string;

  @ManyToOne(() => AiCreation, { nullable: true })
  @JoinColumn({ name: 'aiCreationId' })
  aiCreation?: AiCreation;

  @Column('text')
  prompt: string;

  @Column('json')
  referenceImageUrls: string[];

  @Column()
  status: string;

  @Column()
  approvalState: string;

  @Column('integer', { nullable: true })
  quoteAmountCents?: number;

  @Column({ nullable: true })
  quoteCurrency?: string;

  @Column('integer', { nullable: true })
  depositAmountCents?: number;

  @Column({ nullable: true })
  depositCurrency?: string;

  @Column('text', { nullable: true })
  artisanNote?: string;

  @Column('text', { nullable: true })
  customerMessage?: string;

  @Column({ nullable: true })
  customerName?: string;

  @Column({ nullable: true })
  customerEmail?: string;

  @Column({ nullable: true })
  convertedOrderId?: string;

  @Column()
  createdAt: string;

  @Column()
  updatedAt: string;

  @ManyToOne(() => Artisan, { nullable: true })
  @JoinColumn({ name: 'artisanProfileId' })
  artisanProfile?: Artisan;

  @Column({ nullable: true })
  artisanProfileId?: number;
}
