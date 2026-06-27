import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Craft } from '../entities/craft.entity';
import { Product } from '../entities/product.entity';
import { Event } from '../entities/event.entity';
import { Artisan } from '../entities/artisan.entity';
import { Order } from '../entities/order.entity';
import { MessageThread } from '../entities/message-thread.entity';

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
    @InjectRepository(MessageThread)
    private messageThreadRepository: Repository<MessageThread>,
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
            messageThreads: await this.messageThreadRepository.count(),
          },
        };
      }

      // Seed all data from constants.cjs
      await this.craftRepository.save(CRAFTS);
      await this.productRepository.save(PRODUCTS);
      await this.eventRepository.save(EVENTS);
      await this.artisanRepository.save(ARTISANS);
      await this.orderRepository.save(ORDERS);
      await this.messageThreadRepository.save(MESSAGE_THREADS);

      return {
        message: 'Database seeded successfully! 🌱',
        counts: {
          crafts: await this.craftRepository.count(),
          products: await this.productRepository.count(),
          events: await this.eventRepository.count(),
          artisans: await this.artisanRepository.count(),
          orders: await this.orderRepository.count(),
          messageThreads: await this.messageThreadRepository.count(),
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
      await this.messageThreadRepository.clear();
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
}
