import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeUsers = new Map<number, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization || client.handshake.auth?.token;
      if (!authHeader) {
        client.disconnect();
        return;
      }

      const token = authHeader.split(' ')[1] || authHeader;
      const secret = this.configService.get<string>('JWT_SECRET') || 'officeconnect_secret_key_123_abc';
      const payload = this.jwtService.verify(token, { secret });
      
      client.data.user = payload;
      this.activeUsers.set(payload.sub, client.id);

      // Notify others of online status
      this.server.emit('userStatus', { userId: payload.sub, status: 'online' });
      console.log(`Socket Client connected: ${client.id}, User: ${payload.username}`);
    } catch (err) {
      console.error('Socket connection auth error:', err.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      const userId = client.data.user.sub;
      this.activeUsers.delete(userId);
      this.server.emit('userStatus', { userId, status: 'offline' });
      console.log(`Socket Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineIds = Array.from(this.activeUsers.keys());
    client.emit('onlineUsersList', onlineIds);
  }

  @SubscribeMessage('joinChannel')
  handleJoinChannel(@ConnectedSocket() client: Socket, @MessageBody('channelId') channelId: number) {
    const roomName = `channel_${channelId}`;
    client.join(roomName);
    console.log(`Socket Client ${client.id} joined room: ${roomName}`);
  }

  @SubscribeMessage('leaveChannel')
  handleLeaveChannel(@ConnectedSocket() client: Socket, @MessageBody('channelId') channelId: number) {
    const roomName = `channel_${channelId}`;
    client.leave(roomName);
    console.log(`Socket Client ${client.id} left room: ${roomName}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: number; content: string; attachments?: any[] },
  ) {
    if (!client.data?.user) return;
    const senderId = client.data.user.sub;
    const message = await this.chatService.saveMessage(
      data.channelId,
      senderId,
      data.content,
      data.attachments,
    );

    const roomName = `channel_${data.channelId}`;
    this.server.to(roomName).emit('message', message);
    
    // Also notify other members who might not be in the room
    this.server.emit('messageNotification', {
      channelId: data.channelId,
      message,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: number; isTyping: boolean },
  ) {
    const username = client.data.user.username;
    const userId = client.data.user.sub;
    const roomName = `channel_${data.channelId}`;
    client.to(roomName).emit('typing', {
      channelId: data.channelId,
      userId,
      username,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number; channelId: number },
  ) {
    const userId = client.data.user.sub;
    const receipt = await this.chatService.markAsRead(data.messageId, userId);
    
    const roomName = `channel_${data.channelId}`;
    this.server.to(roomName).emit('readReceipt', {
      messageId: data.messageId,
      channelId: data.channelId,
      receipt,
    });
  }

  // --- WebRTC Audio & Video Call Signaling ---

  @SubscribeMessage('callUser')
  handleCallUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: number; offer: any; callType: 'audio' | 'video'; isGroup?: boolean },
  ) {
    const sender = client.data.user;
    const roomName = `channel_${data.channelId}`;
    client.to(roomName).emit('incomingCall', {
      channelId: data.channelId,
      caller: {
        id: sender.sub,
        username: sender.username,
        fullName: sender.fullName || sender.username,
      },
      offer: data.offer,
      callType: data.callType,
      isGroup: !!data.isGroup,
    });
  }

  @SubscribeMessage('answerCall')
  handleAnswerCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: number; answer: any },
  ) {
    const sender = client.data.user;
    const roomName = `channel_${data.channelId}`;
    client.to(roomName).emit('callAccepted', {
      channelId: data.channelId,
      answer: data.answer,
      answeringUser: {
        id: sender.sub,
        username: sender.username,
        fullName: sender.fullName || sender.username,
      },
    });
  }

  @SubscribeMessage('iceCandidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: number; candidate: any },
  ) {
    const roomName = `channel_${data.channelId}`;
    client.to(roomName).emit('iceCandidate', {
      channelId: data.channelId,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('endCall')
  handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: number },
  ) {
    const roomName = `channel_${data.channelId}`;
    this.server.to(roomName).emit('callEnded', {
      channelId: data.channelId,
    });
  }

  @SubscribeMessage('rejectCall')
  handleRejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: number },
  ) {
    const roomName = `channel_${data.channelId}`;
    client.to(roomName).emit('callRejected', {
      channelId: data.channelId,
    });
  }
}
