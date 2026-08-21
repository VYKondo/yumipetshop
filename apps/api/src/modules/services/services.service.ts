import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  create(petshopId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        ...dto,
        petshopId,
        basePrice: parseFloat(dto.basePrice),
        defaultDurationMin: dto.defaultDurationMin
          ? parseInt(dto.defaultDurationMin)
          : 30, // default 30 min
        active: dto.active !== undefined ? dto.active === 'true' : true,
      },
    });
  }

  findAll(petshopId: string) {
    return this.prisma.service.findMany({
      where: { petshopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(petshopId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, petshopId },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado');
    return service;
  }

  async update(petshopId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(petshopId, id);
    return this.prisma.service.update({
      where: { id },
      data: {
        ...dto,
        basePrice: dto.basePrice ? parseFloat(dto.basePrice) : undefined,
        defaultDurationMin: dto.defaultDurationMin
          ? parseInt(dto.defaultDurationMin)
          : undefined,
        active: dto.active !== undefined ? dto.active === 'true' : undefined,
      },
    });
  }

  async remove(petshopId: string, id: string) {
    await this.findOne(petshopId, id);
    return this.prisma.service.delete({ where: { id } });
  }
}
