import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDogDto } from './dto/create-dog.dto';
import { UpdateDogDto } from './dto/update-dog.dto';

@Injectable()
export class DogsService {
  constructor(private prisma: PrismaService) {}

  create(petshopId: string, dto: CreateDogDto) {
    return this.prisma.dog.create({
      data: { ...dto, petshopId },
    });
  }

  findAll(petshopId: string) {
    return this.prisma.dog.findMany({
      where: { petshopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(petshopId: string, id: string) {
    const dog = await this.prisma.dog.findFirst({
      where: { id, petshopId },
    });
    if (!dog) throw new NotFoundException('Cão não encontrado');
    return dog;
  }

  async update(petshopId: string, id: string, dto: UpdateDogDto) {
    await this.findOne(petshopId, id);
    return this.prisma.dog.update({
      where: { id },
      data: dto,
    });
  }

  async remove(petshopId: string, id: string) {
    await this.findOne(petshopId, id);
    return this.prisma.dog.delete({ where: { id } });
  }
}
