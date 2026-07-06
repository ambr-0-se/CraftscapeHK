import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Craft } from '../entities/craft.entity';
import { Product } from '../entities/product.entity';
import { Event } from '../entities/event.entity';
import { Artisan } from '../entities/artisan.entity';
import { Order } from '../entities/order.entity';
import { Booking } from '../entities/booking.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { MessageThread } from '../entities/message-thread.entity';
import { MessageSenderRole, MessageType } from '@craftscape/contracts';

// Import seed data from constants.cjs
const {
  CRAFTS,
  PRODUCTS,
  EVENTS,
  ARTISANS,
  ORDERS,
  MESSAGE_THREADS,
} = require('../../constants.cjs');

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Craft)
    private craftRepository: Repository<Craft>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Artisan)
    private artisanRepository: Repository<Artisan>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(MessageThread)
    private messageThreadRepository: Repository<MessageThread>,
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
  ) {}

  async seedDatabase() {
    try {
      // Check if already seeded
      const count = await this.craftRepository.count();
      if (count > 0) {
        return {
          message: 'Database already has data',
          counts: {
            crafts: count,
            products: await this.productRepository.count(),
            events: await this.eventRepository.count(),
            artisans: await this.artisanRepository.count(),
            orders: await this.orderRepository.count(),
            bookings: await this.bookingRepository.count(),
            messageThreads: await this.messageThreadRepository.count(),
            chatMessages: await this.chatMessageRepository.count(),
          },
        };
      }

      // Seed all data from constants.cjs
      await this.craftRepository.save(CRAFTS);
      await this.productRepository.save(PRODUCTS);
      await this.eventRepository.save(EVENTS);
      await this.artisanRepository.save(ARTISANS);
      await this.orderRepository.save(ORDERS);
      await this.seedMessages();

      return {
        message: 'Database seeded successfully! 🌱',
        counts: {
          crafts: await this.craftRepository.count(),
          products: await this.productRepository.count(),
          events: await this.eventRepository.count(),
          artisans: await this.artisanRepository.count(),
          orders: await this.orderRepository.count(),
          bookings: await this.bookingRepository.count(),
          messageThreads: await this.messageThreadRepository.count(),
          chatMessages: await this.chatMessageRepository.count(),
        },
      };
    } catch (error) {
      return {
        message: 'Error seeding database',
        error: error.message,
      };
    }
  }

  async reseedDatabase() {
    try {
      // Clear all data first
      await this.chatMessageRepository.clear();
      await this.messageThreadRepository.clear();
      await this.bookingRepository.clear();
      await this.orderRepository.clear();
      await this.artisanRepository.clear();
      await this.craftRepository.clear();
      await this.productRepository.clear();
      await this.eventRepository.clear();

      // Then call seedDatabase
      return this.seedDatabase();
    } catch (error) {
      return {
        message: 'Error reseeding database',
        error: error.message,
      };
    }
  }

  private async seedMessages() {
    const now = Date.now();
    const threads = MESSAGE_THREADS.map(({ messages, ...thread }) => ({
      ...thread,
      contextType: 'product',
      contextId: String(thread.productId),
      contextLabel: thread.customerName,
      lastMessageAt: new Date(now).toISOString(),
      unreadCount: thread.unread ? 1 : 0,
    }));
    await this.messageThreadRepository.save(threads);
    await this.chatMessageRepository.save(
      MESSAGE_THREADS.flatMap((thread) => {
        const messages = thread.messages ?? [];
        return messages.map((message, index) => ({
          id: message.id,
          threadId: thread.id,
          sequence: index + 1,
          senderId: message.sender,
          senderRole:
            message.sender === 'artisan'
              ? MessageSenderRole.Artisan
              : MessageSenderRole.Customer,
          type: message.originalText?.startsWith('<system')
            ? MessageType.System
            : MessageType.Text,
          originalText: message.originalText,
          translatedText: message.translatedText,
          sourceLanguage: message.language,
          targetLanguage: message.language === 'en' ? 'zh' : 'en',
          createdAt: new Date(now - (messages.length - index) * 60000).toISOString(),
        }));
      }),
    );
  }
}
