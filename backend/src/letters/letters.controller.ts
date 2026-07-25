import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { LettersService } from './letters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('letters')
@UseGuards(JwtAuthGuard)
export class LettersController {
  constructor(private lettersService: LettersService) {}

  @Post()
  async create(
    @Request() req,
    @Body('title') title: string,
    @Body('content') content: string,
  ) {
    return this.lettersService.create(title, content, req.user.id);
  }

  @Get()
  async findAll(@Request() req) {
    return this.lettersService.findAll(req.user.id, req.user.role);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.lettersService.findOne(id, req.user.id, req.user.role);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.lettersService.update(id, body, req.user.id);
  }

  @Post(':id/submit')
  async submitForApproval(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.lettersService.submitForApproval(id, req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  @Post(':id/approve')
  async approve(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.lettersService.approve(id, req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  @Post(':id/reject')
  async reject(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.lettersService.reject(id, reason, req.user.id);
  }
}
