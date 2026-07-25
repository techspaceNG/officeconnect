import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Note } from '@prisma/client';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  async create(title: string, content: string, category: string | null, userId: number): Promise<Note> {
    return this.prisma.note.create({
      data: {
        title,
        content,
        category,
        createdById: userId,
      },
    });
  }

  async findAll(userId: number): Promise<Note[]> {
    return this.prisma.note.findMany({
      where: { createdById: userId },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async findOne(id: number, userId: number): Promise<Note> {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    if (note.createdById !== userId) {
      throw new ForbiddenException('You do not own this note');
    }
    return note;
  }

  async update(id: number, data: any, userId: number): Promise<Note> {
    await this.findOne(id, userId); // Validates existence and ownership
    return this.prisma.note.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
      },
    });
  }

  async delete(id: number, userId: number): Promise<Note> {
    await this.findOne(id, userId); // Validates existence and ownership
    return this.prisma.note.delete({ where: { id } });
  }

  async togglePin(id: number, userId: number): Promise<Note> {
    const note = await this.findOne(id, userId);
    return this.prisma.note.update({
      where: { id },
      data: { isPinned: !note.isPinned },
    });
  }
}
