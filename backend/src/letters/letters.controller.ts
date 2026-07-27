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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LettersService } from './letters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Controller('letters')
@UseGuards(JwtAuthGuard)
export class LettersController {
  constructor(private lettersService: LettersService) {}

  @Post()
  @UseInterceptors(FileInterceptor('attachment'))
  async create(
    @Request() req,
    @Body('title') title: string,
    @Body('content') content: string,
    @Body('recipientId') recipientIdStr?: string,
    @UploadedFile() file?: any,
  ) {
    let attachmentPath: string | undefined = undefined;
    if (file) {
      const lettersStorage = path.join(process.cwd(), '..', 'storage', 'letters');
      if (!fs.existsSync(lettersStorage)) fs.mkdirSync(lettersStorage, { recursive: true });
      const uniqueName = `${Date.now()}-${file.originalname}`;
      const absPath = path.join(lettersStorage, uniqueName);
      fs.writeFileSync(absPath, file.buffer);
      attachmentPath = `letters/${uniqueName}`;
    }

    const recipientId = recipientIdStr ? parseInt(recipientIdStr, 10) : undefined;
    return this.lettersService.create(title, content, req.user.id, recipientId, attachmentPath);
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
  @UseInterceptors(FileInterceptor('attachment'))
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @UploadedFile() file?: any,
  ) {
    let attachmentPath: string | undefined = undefined;
    if (file) {
      const lettersStorage = path.join(process.cwd(), '..', 'storage', 'letters');
      if (!fs.existsSync(lettersStorage)) fs.mkdirSync(lettersStorage, { recursive: true });
      const uniqueName = `${Date.now()}-${file.originalname}`;
      const absPath = path.join(lettersStorage, uniqueName);
      fs.writeFileSync(absPath, file.buffer);
      attachmentPath = `letters/${uniqueName}`;
    }

    const data = {
      title: body.title,
      content: body.content,
      recipientId: body.recipientId ? parseInt(body.recipientId, 10) : undefined,
      attachmentPath,
    };

    return this.lettersService.update(id, data, req.user.id);
  }

  @Post(':id/submit')
  async submitForApproval(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('recipientId') recipientId?: number,
  ) {
    return this.lettersService.submitForApproval(id, req.user.id, recipientId);
  }

  @Post(':id/revision')
  async requestRevision(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('remarks') remarks: string,
  ) {
    return this.lettersService.requestRevision(id, remarks, req.user.id);
  }

  @Post(':id/approve')
  async approve(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('remarks') remarks?: string,
  ) {
    return this.lettersService.approve(id, req.user.id, remarks);
  }

  @Post(':id/reject')
  async reject(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.lettersService.reject(id, reason, req.user.id);
  }
}
