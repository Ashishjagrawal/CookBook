import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      
      this.connectedUsers.set(client.id, userId);
      
      // Join user to their personal room
      client.join(`user:${userId}`);
      
      console.log(`User ${userId} connected with socket ${client.id}`);
    } catch (error) {
      console.error('Authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      console.log(`User ${userId} disconnected`);
      this.connectedUsers.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe:notifications')
  async handleSubscribeNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (userId && userId === data.userId) {
      client.join(`notifications:${userId}`);
    }
  }

  @SubscribeMessage('subscribe:recipe')
  async handleSubscribeRecipe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipeId: string },
  ) {
    client.join(`recipe:${data.recipeId}`);
  }

  @SubscribeMessage('subscribe:feed')
  async handleSubscribeFeed(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (userId && userId === data.userId) {
      client.join(`feed:${userId}`);
    }
  }

  @SubscribeMessage('unsubscribe:notifications')
  async handleUnsubscribeNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (userId && userId === data.userId) {
      client.leave(`notifications:${userId}`);
    }
  }

  @SubscribeMessage('unsubscribe:recipe')
  async handleUnsubscribeRecipe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipeId: string },
  ) {
    client.leave(`recipe:${data.recipeId}`);
  }

  @SubscribeMessage('unsubscribe:feed')
  async handleUnsubscribeFeed(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (userId && userId === data.userId) {
      client.leave(`feed:${userId}`);
    }
  }

  // Methods to emit events to specific rooms
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToRecipe(recipeId: string, event: string, data: any) {
    this.server.to(`recipe:${recipeId}`).emit(event, data);
  }

  emitToNotifications(userId: string, event: string, data: any) {
    this.server.to(`notifications:${userId}`).emit(event, data);
  }

  emitToFeed(userId: string, event: string, data: any) {
    this.server.to(`feed:${userId}`).emit(event, data);
  }
}
