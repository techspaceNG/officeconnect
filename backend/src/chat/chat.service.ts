import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Channel, Message, User } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createChannel(name: string, isGroup: boolean, memberIds: number[]): Promise<Channel> {
    // Unique check for direct message between two people
    if (!isGroup && memberIds.length === 2) {
      const existing = await this.prisma.channel.findFirst({
        where: {
          isGroup: false,
          AND: [
            { members: { some: { id: memberIds[0] } } },
            { members: { some: { id: memberIds[1] } } },
          ],
        },
        include: { members: true },
      });
      if (existing) {
        return existing;
      }
    }

    return this.prisma.channel.create({
      data: {
        name,
        isGroup,
        members: {
          connect: memberIds.map((id) => ({ id })),
        },
      },
      include: {
        members: {
          select: { id: true, username: true, fullName: true, role: true },
        },
      },
    });
  }

  async getChannelsForUser(userId: number) {
    return this.prisma.channel.findMany({
      where: {
        members: {
          some: { id: userId },
        },
      },
      include: {
        members: {
          select: { id: true, username: true, fullName: true, role: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, username: true, fullName: true },
            },
          },
        },
      },
    });
  }

  async getChannelMessages(channelId: number, userId: number): Promise<Message[]> {
    // Check if user is a member
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        members: { some: { id: userId } },
      },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found or access denied');
    }

    return this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, username: true, fullName: true, role: true },
        },
        attachments: true,
        readReceipts: {
          include: {
            user: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
    });
  }

  async saveMessage(
    channelId: number,
    senderId: number,
    content: string,
    attachments?: Array<{ name: string; path: string; mimeType: string; size: number }>,
  ): Promise<Message> {
    return this.prisma.message.create({
      data: {
        content,
        channelId,
        senderId,
        attachments: attachments
          ? {
              create: attachments.map((att) => ({
                name: att.name,
                path: att.path,
                mimeType: att.mimeType,
                size: att.size,
              })),
            }
          : undefined,
      },
      include: {
        sender: {
          select: { id: true, username: true, fullName: true, role: true },
        },
        attachments: true,
        readReceipts: true,
      },
    });
  }

  async markAsRead(messageId: number, userId: number) {
    const existing = await this.prisma.readReceipt.findFirst({
      where: { messageId, userId },
    });
    if (existing) return existing;

    return this.prisma.readReceipt.create({
      data: {
        messageId,
        userId,
      },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });
  }

  async getChannelById(channelId: number) {
    return this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          select: { id: true, username: true, fullName: true, role: true },
        },
      },
    });
  }
}
