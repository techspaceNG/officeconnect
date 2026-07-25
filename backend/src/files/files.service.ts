import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FileFolder, File, FileVersion } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  private readonly storageRoot = path.join(process.cwd(), '..', 'storage');

  constructor(private prisma: PrismaService) {
    this.ensureStorageDirectories();
  }

  private ensureStorageDirectories() {
    const subDirs = ['files', 'images', 'documents', 'letters', 'profiles', 'backups'];
    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }
    for (const dir of subDirs) {
      const p = path.join(this.storageRoot, dir);
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
      }
    }
  }

  private getStorageSubDir(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('application/pdf') || mimeType.includes('word') || mimeType.includes('excel')) return 'documents';
    return 'files';
  }

  // --- Folder Management ---

  async createFolder(name: string, parentId: number | null, userId: number): Promise<FileFolder> {
    if (parentId) {
      const parent = await this.prisma.fileFolder.findUnique({ where: { id: parentId } });
      if (!parent || parent.isRecycled) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    return this.prisma.fileFolder.create({
      data: {
        name,
        parentId,
        createdById: userId,
      },
    });
  }

  async getFolderContents(folderId: number | null, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const folderWhere: any = {
      parentId: folderId,
      isRecycled: false,
    };

    const fileWhere: any = {
      folderId: folderId,
      isRecycled: false,
    };

    // If non-admin user is at root level (folderId === null), show only their own uploads
    if (!isSuperAdmin && folderId === null) {
      folderWhere.createdById = userId;
      fileWhere.createdById = userId;
    }

    const folders = await this.prisma.fileFolder.findMany({
      where: folderWhere,
      include: {
        createdBy: {
          select: { id: true, username: true, fullName: true },
        },
      },
    });

    const files = await this.prisma.file.findMany({
      where: fileWhere,
      include: {
        createdBy: {
          select: { id: true, username: true, fullName: true },
        },
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    // Also get breadcrumbs
    const breadcrumbs = [];
    let currentId = folderId;
    while (currentId) {
      const folder = await this.prisma.fileFolder.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });
      if (folder) {
        breadcrumbs.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parentId;
      } else {
        break;
      }
    }

    return { folders, files, breadcrumbs };
  }

  // --- File Management ---

  async uploadFile(
    multerFile: any,
    folderId: number | null,
    userId: number,
  ): Promise<File> {
    if (folderId) {
      const parent = await this.prisma.fileFolder.findUnique({ where: { id: folderId } });
      if (!parent || parent.isRecycled) {
        throw new NotFoundException('Folder not found');
      }
    }

    const subDir = this.getStorageSubDir(multerFile.mimetype);
    const uniqueFilename = `${Date.now()}-${multerFile.originalname}`;
    const relativePath = path.join(subDir, uniqueFilename);
    const absolutePath = path.join(this.storageRoot, relativePath);

    // Save physical file
    fs.writeFileSync(absolutePath, multerFile.buffer);

    const ext = path.extname(multerFile.originalname).toLowerCase();

    // Create DB entry
    return this.prisma.file.create({
      data: {
        name: multerFile.originalname,
        extension: ext,
        mimeType: multerFile.mimetype,
        size: multerFile.size,
        path: relativePath,
        folderId,
        createdById: userId,
        versions: {
          create: {
            version: 1,
            path: relativePath,
            size: multerFile.size,
            createdById: userId,
          },
        },
      },
    });
  }

  async getFile(fileId: number) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async getPhysicalFilePath(fileId: number): Promise<{ absolutePath: string; filename: string; mimeType: string }> {
    const file = await this.getFile(fileId);
    if (file.isRecycled) {
      throw new ForbiddenException('Cannot access recycled file');
    }
    return {
      absolutePath: path.join(this.storageRoot, file.path),
      filename: file.name,
      mimeType: file.mimeType,
    };
  }

  async uploadNewVersion(fileId: number, multerFile: any, userId: number): Promise<File> {
    const file = await this.getFile(fileId);
    if (file.isRecycled) {
      throw new ForbiddenException('Cannot update version of recycled file');
    }

    const subDir = this.getStorageSubDir(multerFile.mimetype);
    const nextVersionNum = file.versions.length + 1;
    const uniqueFilename = `${Date.now()}-v${nextVersionNum}-${multerFile.originalname}`;
    const relativePath = path.join(subDir, uniqueFilename);
    const absolutePath = path.join(this.storageRoot, relativePath);

    // Save physical file
    fs.writeFileSync(absolutePath, multerFile.buffer);

    // Add version and update file
    return this.prisma.file.update({
      where: { id: fileId },
      data: {
        size: multerFile.size,
        path: relativePath, // Point main path to newest version
        versions: {
          create: {
            version: nextVersionNum,
            path: relativePath,
            size: multerFile.size,
            createdById: userId,
          },
        },
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });
  }

  // --- Recycle Bin ---

  async recycleFile(fileId: number): Promise<File> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');

    return this.prisma.file.update({
      where: { id: fileId },
      data: {
        isRecycled: true,
        deletedAt: new Date(),
      },
    });
  }

  async recycleFolder(folderId: number): Promise<FileFolder> {
    const folder = await this.prisma.fileFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');

    // Recursively recycle subfolders and files
    await this.recycleFolderRecursive(folderId);

    return this.prisma.fileFolder.update({
      where: { id: folderId },
      data: {
        isRecycled: true,
        deletedAt: new Date(),
      },
    });
  }

  private async recycleFolderRecursive(parentId: number) {
    // Recycle all files in this folder
    await this.prisma.file.updateMany({
      where: { folderId: parentId },
      data: { isRecycled: true, deletedAt: new Date() },
    });

    // Find all subfolders
    const subs = await this.prisma.fileFolder.findMany({ where: { parentId } });
    for (const sub of subs) {
      await this.recycleFolderRecursive(sub.id);
      await this.prisma.fileFolder.update({
        where: { id: sub.id },
        data: { isRecycled: true, deletedAt: new Date() },
      });
    }
  }

  async getRecycleBin(userId: number) {
    const folders = await this.prisma.fileFolder.findMany({
      where: {
        createdById: userId,
        isRecycled: true,
      },
    });

    const files = await this.prisma.file.findMany({
      where: {
        createdById: userId,
        isRecycled: true,
      },
    });

    return { folders, files };
  }

  async restoreFile(fileId: number): Promise<File> {
    return this.prisma.file.update({
      where: { id: fileId },
      data: {
        isRecycled: false,
        deletedAt: null,
      },
    });
  }

  async restoreFolder(folderId: number): Promise<FileFolder> {
    await this.restoreFolderRecursive(folderId);
    return this.prisma.fileFolder.update({
      where: { id: folderId },
      data: {
        isRecycled: false,
        deletedAt: null,
      },
    });
  }

  private async restoreFolderRecursive(parentId: number) {
    await this.prisma.file.updateMany({
      where: { folderId: parentId },
      data: { isRecycled: false, deletedAt: null },
    });

    const subs = await this.prisma.fileFolder.findMany({ where: { parentId } });
    for (const sub of subs) {
      await this.restoreFolderRecursive(sub.id);
      await this.prisma.fileFolder.update({
        where: { id: sub.id },
        data: { isRecycled: false, deletedAt: null },
      });
    }
  }

  async deleteFilePermanently(fileId: number) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { versions: true },
    });
    if (!file) throw new NotFoundException('File not found');

    // Delete physical files
    for (const v of file.versions) {
      const p = path.join(this.storageRoot, v.path);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }

    // Delete db record (cascade deletes versions)
    return this.prisma.file.delete({ where: { id: fileId } });
  }

  async deleteFolderPermanently(folderId: number) {
    const folder = await this.prisma.fileFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');

    await this.deleteFolderPermanentlyRecursive(folderId);

    return this.prisma.fileFolder.delete({ where: { id: folderId } });
  }

  private async deleteFolderPermanentlyRecursive(parentId: number) {
    // Delete files in folder
    const files = await this.prisma.file.findMany({ where: { folderId: parentId } });
    for (const file of files) {
      await this.deleteFilePermanently(file.id);
    }

    const subs = await this.prisma.fileFolder.findMany({ where: { parentId } });
    for (const sub of subs) {
      await this.deleteFolderPermanentlyRecursive(sub.id);
      await this.prisma.fileFolder.delete({ where: { id: sub.id } });
    }
  }

  async getStorageUsage(): Promise<{ usedBytes: number; totalBytes: number }> {
    const result = await this.prisma.file.aggregate({
      _sum: { size: true },
    });
    const usedBytes = result._sum.size || 0;
    // Let's set a logical LAN storage quota of 100GB (100 * 1024 * 1024 * 1024)
    const totalBytes = 107374182400; 
    return { usedBytes, totalBytes };
  }

  async shareFile(fileId: number, sharedWithId: number, userId: number): Promise<File> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { versions: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (file.createdById !== userId) throw new ForbiddenException('You do not own this file');

    // Create a duplicated entry for the recipient user
    return this.prisma.file.create({
      data: {
        name: file.name,
        extension: file.extension,
        mimeType: file.mimeType,
        size: file.size,
        path: file.path,
        createdById: userId,
        sharedWithId: sharedWithId,
        versions: {
          create: file.versions.map((v) => ({
            version: v.version,
            path: v.path,
            size: v.size,
            createdById: v.createdById,
          })),
        },
      },
    });
  }

  async getSharedWithMe(userId: number): Promise<File[]> {
    return this.prisma.file.findMany({
      where: {
        sharedWithId: userId,
        isRecycled: false,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
