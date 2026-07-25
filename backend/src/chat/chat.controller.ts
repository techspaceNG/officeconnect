import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly storageRoot = path.join(process.cwd(), '..', 'storage', 'files');

  constructor(private chatService: ChatService) {}

  @Post('channel')
  async createChannel(
    @Request() req,
    @Body('name') name: string,
    @Body('isGroup') isGroup: boolean,
    @Body('memberIds') memberIds: number[],
  ) {
    // Add current user to members safely
    const membersArr = Array.isArray(memberIds) ? memberIds : [];
    const allMembers = Array.from(new Set([...membersArr, req.user.id]));
    return this.chatService.createChannel(name, isGroup, allMembers);
  }

  @Get('channels')
  async getChannels(@Request() req) {
    return this.chatService.getChannelsForUser(req.user.id);
  }

  @Get('channel/:id/messages')
  async getChannelMessages(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chatService.getChannelMessages(id, req.user.id);
  }

  @Post('channel/:id/attachment')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
  ) {
    // Save to disk
    const uniqueFilename = `${Date.now()}-${file.originalname}`;
    const relativePath = path.join('files', uniqueFilename);
    const absolutePath = path.join(process.cwd(), '..', 'storage', relativePath);

    fs.writeFileSync(absolutePath, file.buffer);

    // Save message via ChatService
    const attachmentData = [{
      name: file.originalname,
      path: relativePath,
      mimeType: file.mimetype,
      size: file.size,
    }];

    return this.chatService.saveMessage(id, req.user.id, `Uploaded attachment: ${file.originalname}`, attachmentData);
  }
}
