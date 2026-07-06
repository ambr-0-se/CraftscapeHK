import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './messages.dto';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messagesService: MessagesService) {}

  handleConnection(client: Socket) {
    client.emit('messages:connection', { status: 'connected' });
  }

  handleDisconnect(client: Socket) {
    client.rooms.forEach((room) => {
      if (room.startsWith('thread:')) {
        client.leave(room);
      }
    });
  }

  @SubscribeMessage('thread:join')
  async joinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { threadId: string; afterSequence?: number },
  ) {
    const room = this.threadRoom(body.threadId);
    await client.join(room);
    const messages = await this.messagesService.replayMessages(
      body.threadId,
      body.afterSequence ?? 0,
    );
    client.emit('thread:replay', { threadId: body.threadId, messages });
    return { ok: true, threadId: body.threadId };
  }

  @SubscribeMessage('thread:leave')
  async leaveThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { threadId: string },
  ) {
    await client.leave(this.threadRoom(body.threadId));
    return { ok: true, threadId: body.threadId };
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @MessageBody() body: { threadId: string; message: SendMessageDto },
  ) {
    const message = await this.messagesService.sendMessage(
      body.threadId,
      body.message,
    );
    this.server
      .to(this.threadRoom(body.threadId))
      .emit('message:new', { threadId: body.threadId, message });
    this.server.emit('thread:updated', { threadId: body.threadId, message });
    return { ok: true, message };
  }

  broadcastMessage(threadId: string, message: unknown) {
    this.server
      .to(this.threadRoom(threadId))
      .emit('message:new', { threadId, message });
    this.server.emit('thread:updated', { threadId, message });
  }

  private threadRoom(threadId: string): string {
    return `thread:${threadId}`;
  }
}
