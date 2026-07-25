import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OfficialLetter, LetterStatus, Role } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LettersService {
  private readonly lettersRoot = path.join(process.cwd(), '..', 'storage', 'letters');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.lettersRoot)) {
      fs.mkdirSync(this.lettersRoot, { recursive: true });
    }
  }

  async create(title: string, content: string, userId: number): Promise<OfficialLetter> {
    return this.prisma.officialLetter.create({
      data: {
        title,
        content,
        createdById: userId,
        status: LetterStatus.DRAFT,
      },
    });
  }

  async findAll(userId: number, role: Role): Promise<OfficialLetter[]> {
    if (role === Role.SUPER_ADMIN || role === Role.DIRECTOR) {
      return this.prisma.officialLetter.findMany({
        include: {
          createdBy: { select: { id: true, username: true, fullName: true } },
          approver: { select: { id: true, username: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.officialLetter.findMany({
      where: { createdById: userId },
      include: {
        createdBy: { select: { id: true, username: true, fullName: true } },
        approver: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number, role: Role): Promise<OfficialLetter> {
    const letter = await this.prisma.officialLetter.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, username: true, fullName: true } },
        approver: { select: { id: true, username: true, fullName: true } },
      },
    });
    if (!letter) {
      throw new NotFoundException('Letter not found');
    }
    if (role !== Role.SUPER_ADMIN && role !== Role.DIRECTOR && letter.createdById !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return letter;
  }

  async update(id: number, data: any, userId: number): Promise<OfficialLetter> {
    const letter = await this.prisma.officialLetter.findUnique({ where: { id } });
    if (!letter) throw new NotFoundException('Letter not found');
    if (letter.createdById !== userId) throw new ForbiddenException('Not your letter');
    if (letter.status === LetterStatus.APPROVED) {
      throw new BadRequestException('Cannot edit an approved letter');
    }

    return this.prisma.officialLetter.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        status: LetterStatus.DRAFT, // Reset status to draft on edit
      },
    });
  }

  async submitForApproval(id: number, userId: number): Promise<OfficialLetter> {
    const letter = await this.prisma.officialLetter.findUnique({ where: { id } });
    if (!letter) throw new NotFoundException('Letter not found');
    if (letter.createdById !== userId) throw new ForbiddenException('Not your letter');
    if (letter.status !== LetterStatus.DRAFT && letter.status !== LetterStatus.REJECTED) {
      throw new BadRequestException('Letter is already submitted or approved');
    }

    return this.prisma.officialLetter.update({
      where: { id },
      data: { status: LetterStatus.PENDING_APPROVAL },
    });
  }

  async approve(id: number, approverId: number): Promise<OfficialLetter> {
    const letter = await this.prisma.officialLetter.findUnique({ where: { id } });
    if (!letter) throw new NotFoundException('Letter not found');
    if (letter.status !== LetterStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Letter is not pending approval');
    }

    // Generate reference number
    const count = await this.prisma.officialLetter.count({
      where: { status: LetterStatus.APPROVED },
    });
    const nextSeq = String(count + 1).padStart(4, '0');
    const year = new Date().getFullYear();
    const referenceNumber = `ICT-${year}-${nextSeq}`;

    // Create official document file on disk (HTML format for premium looking prints)
    const fileName = `${referenceNumber.replace(/-/g, '_')}.html`;
    const relativePath = path.join('letters', fileName);
    const absolutePath = path.join(this.lettersRoot, fileName);

    const letterHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Official Letter - ${referenceNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          .header { border-bottom: 2px solid #0056b3; padding-bottom: 10px; margin-bottom: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; color: #0056b3; }
          .header p { margin: 5px 0 0 0; font-size: 14px; color: #666; }
          .meta { margin-bottom: 35px; }
          .meta table { width: 100%; border-collapse: collapse; }
          .meta td { padding: 4px 0; }
          .meta td.label { font-weight: bold; width: 150px; }
          .content { margin-bottom: 40px; font-size: 16px; min-height: 200px; }
          .footer { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 15px; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>OFFICECONNECT INTERNAL COLLABORATION PLATFORM</h1>
          <p>ICT DEPARTMENT -- OFFICIAL CORRESPONDENCE</p>
        </div>
        <div class="meta">
          <table>
            <tr>
              <td class="label">Reference No:</td>
              <td><strong>${referenceNumber}</strong></td>
            </tr>
            <tr>
              <td class="label">Date:</td>
              <td>${new Date().toLocaleDateString()}</td>
            </tr>
            <tr>
              <td class="label">Subject:</td>
              <td><strong>${letter.title}</strong></td>
            </tr>
          </table>
        </div>
        <div class="content">
          ${letter.content.replace(/\n/g, '<br>')}
        </div>
        <div class="footer">
          <p>This is a system-generated official letter validated by the ICT Director.</p>
        </div>
      </body>
      </html>
    `;

    fs.writeFileSync(absolutePath, letterHtml);

    return this.prisma.officialLetter.update({
      where: { id },
      data: {
        status: LetterStatus.APPROVED,
        approverId,
        referenceNumber,
        filePath: relativePath,
      },
    });
  }

  async reject(id: number, rejectionReason: string, approverId: number): Promise<OfficialLetter> {
    const letter = await this.prisma.officialLetter.findUnique({ where: { id } });
    if (!letter) throw new NotFoundException('Letter not found');
    if (letter.status !== LetterStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Letter is not pending approval');
    }

    return this.prisma.officialLetter.update({
      where: { id },
      data: {
        status: LetterStatus.REJECTED,
        approverId,
        rejectionReason,
      },
    });
  }
}
