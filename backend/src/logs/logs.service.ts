import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ActivityLog, Role } from '@prisma/client';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async logAction(action: string, details: string | null, userId: number | null): Promise<ActivityLog> {
    return this.prisma.activityLog.create({
      data: {
        action,
        details,
        userId,
      },
    });
  }

  async findAll(role: Role): Promise<ActivityLog[]> {
    if (role !== Role.SUPER_ADMIN && role !== Role.DIRECTOR) {
      throw new ForbiddenException('Only administrators can view audit logs');
    }
    return this.prisma.activityLog.findMany({
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // Limit to recent 200 logs
    });
  }
}
