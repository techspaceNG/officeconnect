import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User, Role } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any): Promise<User> {
    const trimmedUsername = data.username.trim();
    const existing = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: trimmedUsername,
          mode: 'insensitive',
        },
      },
    });
    if (existing) {
      throw new ConflictException('Username already exists');
    }
    const hashedPassword = await argon2.hash(data.password);
    return this.prisma.user.create({
      data: {
        username: trimmedUsername,
        password: hashedPassword,
        fullName: data.fullName,
        role: data.role || Role.STAFF,
      },
    });
  }

  async findOne(username: string): Promise<User | null> {
    if (!username) return null;
    return this.prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: 'insensitive',
        },
      },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        active: true,
      },
    });
  }

  async setStatus(id: number, active: boolean): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { active },
    });
  }
}
