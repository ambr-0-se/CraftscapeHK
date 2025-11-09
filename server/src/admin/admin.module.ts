import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Craft } from '../entities/craft.entity';
import { Product } from '../entities/product.entity';
import { Event } from '../entities/event.entity';
import { Artisan } from '../entities/artisan.entity';
import { Order } from '../entities/order.entity';
import { MessageThread } from '../entities/message-thread.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Craft,
      Product,
      Event,
      Artisan,
      Order,
      MessageThread,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
