import { Module, Controller, Get } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { CraftsModule } from './crafts/crafts.module';
import { EventsModule } from './events/events.module';
import { OrdersModule } from './orders/orders.module';
import { MessagesModule } from './messages/messages.module';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './ai/ai.module';
import { DebugModule } from './debug/debug.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';

@Controller()
export class AppController {
  @Get()
  getHello(): object {
    return {
      message: 'CraftsHK AI Backend is running! 🚀',
      version: '3.0.0',
      endpoints: {
        products: '/api/products',
        crafts: '/api/crafts',
        events: '/api/events',
        orders: '/api/orders',
        messages: '/api/messages',
        auth: '/api/auth (login, register, profile)',
        admin: '/admin/seed (POST)',
        debug: '/debug (development only)'
      }
    };
  }
}

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ProductsModule,
    CraftsModule,
    EventsModule,
    OrdersModule,
    MessagesModule,
    AiModule,
    DebugModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
