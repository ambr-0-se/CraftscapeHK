import { Column, Entity } from 'typeorm';
import { MessageSenderRole, MessageType } from '@craftscape/contracts';
import type { LanguageCode } from '@craftscape/contracts';

@Entity('chat_messages')
export class ChatMessage {
  @Column({ primary: true })
  id: string;

  @Column()
  threadId: string;

  @Column()
  sequence: number;

  @Column()
  senderId: string;

  @Column({ type: 'text' })
  senderRole: MessageSenderRole;

  @Column({ type: 'text', default: MessageType.Text })
  type: MessageType;

  @Column({ type: 'text', nullable: true })
  originalText?: string;

  @Column({ type: 'text', nullable: true })
  translatedText?: string;

  @Column({ type: 'text', nullable: true })
  sourceLanguage?: LanguageCode;

  @Column({ type: 'text', nullable: true })
  targetLanguage?: LanguageCode;

  @Column({ type: 'simple-json', nullable: true })
  attachmentUrls?: string[];

  @Column({ nullable: true })
  clientMutationId?: string;

  @Column()
  createdAt: string;
}
