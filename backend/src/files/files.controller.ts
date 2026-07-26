import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('folder')
  async createFolder(
    @Request() req,
    @Body('name') name: string,
    @Body('parentId') parentId?: number,
  ) {
    return this.filesService.createFolder(name, parentId || null, req.user.id);
  }

  @Get('folder/contents')
  async getFolderContents(
    @Request() req,
    @Query('folderId') folderId?: string,
  ) {
    const fId = folderId ? parseInt(folderId, 10) : null;
    return this.filesService.getFolderContents(fId, req.user.id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Request() req,
    @UploadedFile() file: any,
    @Body('folderId') folderId?: string,
  ) {
    const fId = folderId ? parseInt(folderId, 10) : null;
    return this.filesService.uploadFile(file, fId, req.user.id);
  }

  @Post('upload-version/:id')
  @UseInterceptors(FileInterceptor('file'))
  async uploadNewVersion(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
  ) {
    return this.filesService.uploadNewVersion(id, file, req.user.id);
  }

  @Get('download/:id')
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { absolutePath, filename, mimeType } = await this.filesService.getPhysicalFilePath(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.sendFile(absolutePath);
  }

  @Post('recycle/file/:id')
  async recycleFile(@Param('id', ParseIntPipe) id: number) {
    return this.filesService.recycleFile(id);
  }

  @Post('recycle/folder/:id')
  async recycleFolder(@Param('id', ParseIntPipe) id: number) {
    return this.filesService.recycleFolder(id);
  }

  @Get('recycle-bin')
  async getRecycleBin(@Request() req) {
    return this.filesService.getRecycleBin(req.user.id);
  }

  @Post('restore/file/:id')
  async restoreFile(@Param('id', ParseIntPipe) id: number) {
    return this.filesService.restoreFile(id);
  }

  @Post('restore/folder/:id')
  async restoreFolder(@Param('id', ParseIntPipe) id: number) {
    return this.filesService.restoreFolder(id);
  }

  @Delete('permanent/file/:id')
  async deleteFilePermanently(@Param('id', ParseIntPipe) id: number) {
    await this.filesService.deleteFilePermanently(id);
    return { success: true };
  }

  @Delete('permanent/folder/:id')
  async deleteFolderPermanently(@Param('id', ParseIntPipe) id: number) {
    await this.filesService.deleteFolderPermanently(id);
    return { success: true };
  }

  @Get('usage')
  async getStorageUsage() {
    return this.filesService.getStorageUsage();
  }

  @Post('share')
  async shareFile(
    @Request() req,
    @Body('fileId') fileId: number,
    @Body('userIds') userIds?: number[],
    @Body('sharedWithId') sharedWithId?: number,
  ) {
    const targets = Array.isArray(userIds) ? userIds : (sharedWithId ? [sharedWithId] : []);
    const results = [];
    for (const targetId of targets) {
      const res = await this.filesService.shareFile(fileId, targetId, req.user.id);
      results.push(res);
    }
    return { success: true, count: results.length, files: results };
  }

  @Get('shared-with-me')
  async getSharedWithMe(@Request() req) {
    return this.filesService.getSharedWithMe(req.user.id);
  }
}
