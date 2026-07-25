import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Get()
  async getLogs(@Request() req) {
    return this.logsService.findAll(req.user.role);
  }
}
