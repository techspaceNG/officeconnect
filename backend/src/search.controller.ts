import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Role } from '@prisma/client';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async search(@Request() req, @Query('q') query: string) {
    if (!query || query.trim() === '') {
      return { files: [], folders: [], notes: [], letters: [], messages: [] };
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const q = query.trim();

    // 1. Search Files
    const files = await this.prisma.file.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        isRecycled: false,
      },
      include: {
        createdBy: { select: { id: true, username: true, fullName: true } },
      },
      take: 10,
    });

    // 2. Search Folders
    const folders = await this.prisma.fileFolder.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        isRecycled: false,
      },
      include: {
        createdBy: { select: { id: true, username: true, fullName: true } },
      },
      take: 10,
    });

    // 3. Search Notes
    const notes = await this.prisma.note.findMany({
      where: {
        createdById: userId,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });

    // 4. Search Letters (depending on role)
    const letterWhereClause: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ],
    };
    if (userRole !== Role.SUPER_ADMIN && userRole !== Role.DIRECTOR) {
      letterWhereClause.createdById = userId;
    }
    const letters = await this.prisma.officialLetter.findMany({
      where: letterWhereClause,
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
      take: 10,
    });

    // 5. Search Messages in user's channels
    const messages = await this.prisma.message.findMany({
      where: {
        content: { contains: q, mode: 'insensitive' },
        channel: {
          members: { some: { id: userId } },
        },
      },
      include: {
        sender: { select: { id: true, username: true, fullName: true } },
        channel: { select: { id: true, name: true, isGroup: true } },
      },
      take: 10,
    });

    return {
      files,
      folders,
      notes,
      letters,
      messages,
    };
  }
}
