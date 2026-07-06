import { Entity, Column } from 'typeorm';
import { MessageThreadContextType } from '@craftscape/contracts';

@Entity('message_threads')
export class MessageThread {
  @Column({ primary: true })
  id: string;

  @Column()
  customerName: string;

  /** Platform customer user id for MVP ownership. */
  @Column({ nullable: true })
  customerId?: string;

  /** Platform artisan user id for MVP ownership. */
  @Column({ nullable: true })
  artisanId?: string;

  @Column()
  lastMessage: string;

  @Column({ nullable: true })
  lastMessageAt?: string;

  @Column()
  timestamp: string;

  @Column({ default: false })
  unread: boolean;

  @Column({ default: 0 })
  unreadCount: number;

  @Column()
  avatar: string;

  @Column({ type: 'text', default: MessageThreadContextType.Product })
  contextType: MessageThreadContextType;

  @Column({ nullable: true })
  contextId?: string;

  @Column({ nullable: true })
  contextLabel?: string;

  @Column({ nullable: true })
  productId?: number;
}
