import { Module, Controller, Get, OnModuleInit } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { CraftsModule } from './crafts/crafts.module';
import { EventsModule } from './events/events.module';
import { OrdersModule } from './orders/orders.module';
import { MessagesModule } from './messages/messages.module';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './ai/ai.module';
import { DebugModule } from './debug/debug.module';
import { AdminModule } from './admin/admin.module';
import { AdminService } from './admin/admin.service';

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
        admin: '/admin/seed (POST)',
        debug: '/debug (development only)'
      }
    };
  }
}

@Module({
  imports: [
    DatabaseModule,
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
export class AppModule implements OnModuleInit {
  constructor(private readonly adminService: AdminService) {}

  async onModuleInit() {
    // Auto-seed database on startup if empty
    console.log('🔍 Checking database status...');
    try {
      const result = await this.adminService.seedDatabase();
      console.log('✅ Database check complete:', result.message);
      if (result.counts) {
        console.log('📊 Database counts:', result.counts);
      }
    } catch (error) {
      console.error('❌ Error during database initialization:', error);
    }
  }
}
