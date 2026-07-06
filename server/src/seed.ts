import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Craft } from './entities/craft.entity';
import { Product } from './entities/product.entity';
import { Event } from './entities/event.entity';
import { Artisan } from './entities/artisan.entity';
import { Order } from './entities/order.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { MessageThread } from './entities/message-thread.entity';
import { MessageSenderRole, MessageType } from '@craftscape/contracts';
const { CRAFTS, PRODUCTS, EVENTS, ARTISANS, ORDERS, MESSAGE_THREADS } = require('../../constants.cjs');

async function seed() {
  console.log('🌱 Starting database seeding...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Clear existing data (orders first due to foreign key constraints)
    await dataSource.query('DELETE FROM bookings');
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM chat_messages');
    await dataSource.query('DELETE FROM message_threads');
    await dataSource.query('DELETE FROM crafts');
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM events');
    await dataSource.query('DELETE FROM artisans');
    console.log('✅ Cleared existing data');

    // Seed crafts
    const craftRepository = dataSource.getRepository(Craft);
    await craftRepository.save(CRAFTS);
    console.log(`✅ Seeded ${CRAFTS.length} crafts`);

    // Seed products
    const productRepository = dataSource.getRepository(Product);
    await productRepository.save(PRODUCTS);
    console.log(`✅ Seeded ${PRODUCTS.length} products`);

    // Seed events
    const eventRepository = dataSource.getRepository(Event);
    await eventRepository.save(EVENTS);
    console.log(`✅ Seeded ${EVENTS.length} events`);

    // Seed artisans
    const artisanRepository = dataSource.getRepository(Artisan);
    await artisanRepository.save(ARTISANS);
    console.log(`✅ Seeded ${ARTISANS.length} artisans`);

    // Seed orders
    const orderRepository = dataSource.getRepository(Order);
    await orderRepository.save(ORDERS);
    console.log(`✅ Seeded ${ORDERS.length} orders`);

    // Seed message threads
    const messageRepository = dataSource.getRepository(MessageThread);
    const messageEntityRepository = dataSource.getRepository(ChatMessage);
    const threads = MESSAGE_THREADS.map(({ messages, ...thread }) => ({
      ...thread,
      contextType: 'product',
      contextId: String(thread.productId),
      contextLabel: thread.customerName,
      lastMessageAt: new Date().toISOString(),
      unreadCount: thread.unread ? 1 : 0,
    }));
    await messageRepository.save(threads);
    await messageEntityRepository.save(
      MESSAGE_THREADS.flatMap((thread) =>
        (thread.messages ?? []).map((message, index) => ({
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
          createdAt: new Date(Date.now() - (thread.messages.length - index) * 60000).toISOString(),
        })),
      ),
    );
    console.log(`✅ Seeded ${MESSAGE_THREADS.length} message threads`);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await app.close();
  }
}

seed();
