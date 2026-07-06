import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { ChatMessage } from '../entities/chat-message.entity';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';
import { MessageThread } from '../entities/message-thread.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MessageThread, ChatMessage]), AiModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
