import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private notesService: NotesService) {}

  @Post()
  async create(
    @Request() req,
    @Body('title') title: string,
    @Body('content') content: string,
    @Body('category') category?: string,
  ) {
    return this.notesService.create(title, content, category || null, req.user.id);
  }

  @Get()
  async findAll(@Request() req) {
    return this.notesService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.notesService.findOne(id, req.user.id);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.notesService.update(id, body, req.user.id);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.notesService.delete(id, req.user.id);
  }

  @Post(':id/pin')
  async togglePin(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.notesService.togglePin(id, req.user.id);
  }
}
