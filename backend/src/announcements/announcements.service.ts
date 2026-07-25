import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Announcement } from '@prisma/client';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async create(title: string, content: string, userId: number): Promise<Announcement> {
    return this.prisma.announcement.create({
      data: {
        title,
        content,
        createdById: userId,
      },
    });
  }

  async findAll(): Promise<Announcement[]> {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: number): Promise<Announcement> {
    const item = await this.prisma.announcement.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Announcement not found');
    return this.prisma.announcement.delete({ where: { id } });
  }
}
