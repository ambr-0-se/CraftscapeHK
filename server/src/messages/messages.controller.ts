import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MessageThreadContextType } from '@craftscape/contracts';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';
import {
  CreateMessageThreadDto,
  ReplayMessagesQueryDto,
  SendMessageDto,
} from './messages.dto';

@Controller('api/messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  @Get()
  async findAll(
    @Query('customerId') customerId?: string,
    @Query('artisanId') artisanId?: string,
  ) {
    return this.messagesService.findAll({ customerId, artisanId });
  }

  @Post('threads')
  async ensureThread(@Body() body: CreateMessageThreadDto) {
    return this.messagesService.ensureThread(body);
  }

  @Get('context/:contextType/:contextId')
  async findByContext(
    @Param('contextType') contextType: MessageThreadContextType,
    @Param('contextId') contextId: string,
  ) {
    return this.messagesService.findByContext(contextType, contextId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }

  @Get(':id/messages')
  async replayMessages(
    @Param('id') id: string,
    @Query() query: ReplayMessagesQueryDto,
  ) {
    return this.messagesService.replayMessages(
      id,
      Number(query.afterSequence ?? 0),
      Number(query.limit ?? 50),
    );
  }

  @Post(':id/messages')
  async sendMessage(@Param('id') id: string, @Body() body: SendMessageDto) {
    const message = await this.messagesService.sendMessage(id, body);
    this.messagesGateway.broadcastMessage(id, message);
    return message;
  }
}
