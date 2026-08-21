import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(petshopId: string, dto: CreateUserDto) {
    // Check if email already exists in this petshop
    const existing = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        petshopId,
      },
    });

    if (existing) {
      throw new NotFoundException('Email já cadastrado neste petshop');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        ...dto,
        petshopId,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  findAll(petshopId: string) {
    return this.prisma.user.findMany({
      where: { petshopId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(petshopId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, petshopId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(petshopId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(petshopId, id); // Verify exists

    const updateData: any = { ...dto };

    if (updateData.password) {
      updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
      delete updateData.password;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(petshopId: string, id: string) {
    await this.findOne(petshopId, id); // Verify exists

    // Prevent removing the last owner
    const ownerCount = await this.prisma.user.count({
      where: { petshopId, role: 'OWNER' },
    });

    if (ownerCount <= 1) {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });

      if (user?.role === 'OWNER') {
        throw new NotFoundException(
          'Não é possível remover o último proprietário',
        );
      }
    }

    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        deletedAt: true,
      },
    });
  }
}