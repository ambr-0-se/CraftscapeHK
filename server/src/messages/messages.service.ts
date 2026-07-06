import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MessageSenderRole,
  MessageThreadContextType,
  MessageType,
} from '@craftscape/contracts';
import type {
  ChatMessageContract,
  LanguageCode,
  MessageThreadSummaryContract,
} from '@craftscape/contracts';
import { AiService } from '../ai/ai.service';
import { ChatMessage } from '../entities/chat-message.entity';
import { MessageThread } from '../entities/message-thread.entity';
import { CreateMessageThreadDto, SendMessageDto } from './messages.dto';

type UiChatMessage = ChatMessageContract & {
  sender: 'customer' | 'artisan' | 'system';
  language: LanguageCode;
  timestamp: string;
};

type UiMessageThread = MessageThread &
  MessageThreadSummaryContract & {
    messages?: UiChatMessage[];
  };

const DEFAULT_CUSTOMER_ID = 'customer-demo';
const DEFAULT_ARTISAN_ID = 'artisan-1';

@Injectable()
export class MessagesService {
  private readonly sendQueues = new Map<string, Promise<unknown>>();

  constructor(
    @InjectRepository(MessageThread)
    private readonly threadRepository: Repository<MessageThread>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    private readonly aiService: AiService,
  ) {}

  async findAll(filters?: {
    customerId?: string;
    artisanId?: string;
  }): Promise<UiMessageThread[]> {
    const threads = await this.threadRepository.find({
      order: { lastMessageAt: 'DESC', timestamp: 'DESC' },
    });

    const scopedThreads = threads.filter((thread) => {
      if (filters?.customerId && (thread.customerId ?? DEFAULT_CUSTOMER_ID) !== filters.customerId) {
        return false;
      }
      if (filters?.artisanId && (thread.artisanId ?? DEFAULT_ARTISAN_ID) !== filters.artisanId) {
        return false;
      }
      return true;
    });

    return Promise.all(scopedThreads.map((thread) => this.toThreadResponse(thread, true)));
  }

  async findOne(id: string): Promise<UiMessageThread> {
    const thread = await this.getThreadOrThrow(id);
    return this.toThreadResponse(thread, true);
  }

  async ensureThread(input: CreateMessageThreadDto): Promise<UiMessageThread> {
    const contextType = input.contextType ?? MessageThreadContextType.Product;
    const contextId = input.contextId;
    const customerId = input.customerId ?? DEFAULT_CUSTOMER_ID;
    const artisanId = input.artisanId ?? DEFAULT_ARTISAN_ID;

    const existing = await this.threadRepository.findOne({
      where: { customerId, artisanId, contextType, contextId },
    });
    if (existing) {
      const shouldBackfillContext =
        (!existing.contextLabel && input.contextLabel) ||
        (!existing.productId && input.productId) ||
        existing.contextId !== contextId ||
        existing.contextType !== contextType;

      if (shouldBackfillContext) {
        existing.contextType = contextType;
        existing.contextId = contextId;
        existing.contextLabel = existing.contextLabel ?? input.contextLabel;
        existing.productId = existing.productId ?? input.productId;
        await this.threadRepository.save(existing);
      }

      return this.toThreadResponse(existing, true);
    }

    const now = new Date().toISOString();
    const thread = this.threadRepository.create({
      id: `MSG-${Date.now()}`,
      customerId,
      artisanId,
      customerName: input.customerName ?? 'Craftscape customer',
      avatar:
        input.avatar ??
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=120&auto=format&fit=crop',
      contextType,
      contextId,
      contextLabel: input.contextLabel,
      productId: input.productId,
      lastMessage: '',
      lastMessageAt: now,
      timestamp: this.formatTimestamp(now),
      unread: false,
      unreadCount: 0,
    });

    const saved = await this.threadRepository.save(thread);
    return this.toThreadResponse(saved, true);
  }

  async findByContext(
    contextType: MessageThreadContextType,
    contextId: string,
  ): Promise<UiMessageThread | null> {
    const thread = await this.threadRepository.findOne({
      where: {
        contextType,
        contextId,
        customerId: DEFAULT_CUSTOMER_ID,
        artisanId: DEFAULT_ARTISAN_ID,
      },
    });

    return thread ? this.toThreadResponse(thread, true) : null;
  }

  async replayMessages(
    threadId: string,
    afterSequence = 0,
    limit = 50,
  ): Promise<UiChatMessage[]> {
    await this.getThreadOrThrow(threadId);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.threadId = :threadId', { threadId })
      .andWhere('message.sequence > :afterSequence', { afterSequence })
      .orderBy('message.sequence', 'ASC')
      .limit(safeLimit)
      .getMany();

    return messages.map((message) => this.toMessageResponse(message));
  }

  async sendMessage(threadId: string, input: SendMessageDto): Promise<UiChatMessage> {
    return this.enqueueThreadWrite(threadId, () => this.persistMessage(threadId, input));
  }

  private async persistMessage(
    threadId: string,
    input: SendMessageDto,
  ): Promise<UiChatMessage> {
    const thread = await this.getThreadOrThrow(threadId);

    if (input.clientMutationId) {
      const duplicate = await this.messageRepository.findOne({
        where: { threadId, clientMutationId: input.clientMutationId },
      });
      if (duplicate) {
        return this.toMessageResponse(duplicate);
      }
    }

    const originalText = input.originalText?.trim();
    if (!originalText) {
      throw new BadRequestException('Message originalText is required');
    }

    const sourceLanguage = input.sourceLanguage ?? this.detectLanguage(originalText);
    const targetLanguage =
      input.targetLanguage ?? (sourceLanguage === 'en' ? 'zh' : 'en');
    const translatedText =
      input.type === MessageType.System || !originalText
        ? undefined
        : await this.aiService.translateChatMessage(
            originalText,
            sourceLanguage,
            targetLanguage,
          );

    const sequence = await this.nextSequence(threadId);
    const createdAt = new Date().toISOString();
    const message = this.messageRepository.create({
      id: `MSG-${threadId}-${sequence}`,
      threadId,
      sequence,
      senderId: input.senderId ?? input.senderRole,
      senderRole: input.senderRole,
      type: input.type ?? MessageType.Text,
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      attachmentUrls: input.attachmentUrls,
      clientMutationId: input.clientMutationId,
      createdAt,
    });

    const saved = await this.messageRepository.save(message);
    thread.lastMessage = translatedText || originalText;
    thread.lastMessageAt = createdAt;
    thread.timestamp = this.formatTimestamp(createdAt);
    thread.unread = input.senderRole === MessageSenderRole.Customer;
    thread.unreadCount =
      input.senderRole === MessageSenderRole.Customer
        ? (thread.unreadCount ?? 0) + 1
        : thread.unreadCount ?? 0;
    await this.threadRepository.save(thread);

    return this.toMessageResponse(saved);
  }

  private enqueueThreadWrite<T>(
    threadId: string,
    write: () => Promise<T>,
  ): Promise<T> {
    const previous = this.sendQueues.get(threadId) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(write)
      .finally(() => {
        if (this.sendQueues.get(threadId) === current) {
          this.sendQueues.delete(threadId);
        }
      });

    this.sendQueues.set(threadId, current);
    return current;
  }

  private async getThreadOrThrow(id: string): Promise<MessageThread> {
    const thread = await this.threadRepository.findOne({ where: { id } });
    if (!thread) {
      throw new NotFoundException(`Message thread with ID "${id}" not found`);
    }
    return thread;
  }

  private async toThreadResponse(
    thread: MessageThread,
    includeMessages: boolean,
  ): Promise<UiMessageThread> {
    const messages = includeMessages
      ? await this.replayMessages(thread.id, 0, 50)
      : undefined;
    const lastMessage = messages?.[messages.length - 1];

    return {
      ...thread,
      customerId: thread.customerId ?? DEFAULT_CUSTOMER_ID,
      artisanId: thread.artisanId ?? DEFAULT_ARTISAN_ID,
      contextType: thread.contextType ?? MessageThreadContextType.Product,
      contextId:
        thread.contextId ??
        (typeof thread.productId === 'number' ? String(thread.productId) : thread.id),
      lastMessagePreview:
        lastMessage?.translatedText ||
        lastMessage?.originalText ||
        thread.lastMessage ||
        '',
      lastMessageAt:
        lastMessage?.createdAt || thread.lastMessageAt || new Date().toISOString(),
      unreadCount: thread.unreadCount ?? (thread.unread ? 1 : 0),
      timestamp:
        thread.timestamp ||
        this.formatTimestamp(thread.lastMessageAt || new Date().toISOString()),
      messages,
    };
  }

  private toMessageResponse(message: ChatMessage): UiChatMessage {
    const sender = this.toUiSender(message.senderRole);
    return {
      id: message.id,
      threadId: message.threadId,
      sequence: message.sequence,
      senderId: message.senderId,
      senderRole: message.senderRole,
      sender,
      type: message.type,
      originalText: message.originalText,
      translatedText: message.translatedText,
      sourceLanguage: message.sourceLanguage,
      targetLanguage: message.targetLanguage,
      attachmentUrls: message.attachmentUrls,
      clientMutationId: message.clientMutationId,
      createdAt: message.createdAt,
      language: message.sourceLanguage ?? 'en',
      timestamp: this.formatTimestamp(message.createdAt),
    };
  }

  private async nextSequence(threadId: string): Promise<number> {
    const latest = await this.messageRepository.findOne({
      where: { threadId },
      order: { sequence: 'DESC' },
    });
    return (latest?.sequence ?? 0) + 1;
  }

  private detectLanguage(text: string): LanguageCode {
    return /[\u3400-\u9fff]/.test(text) ? 'zh' : 'en';
  }

  private toUiSender(role: MessageSenderRole): 'customer' | 'artisan' | 'system' {
    if (role === MessageSenderRole.Artisan) {
      return 'artisan';
    }
    if (role === MessageSenderRole.System) {
      return 'system';
    }
    return 'customer';
  }

  private formatTimestamp(iso: string): string {
    return new Intl.DateTimeFormat('en-HK', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  }
}
