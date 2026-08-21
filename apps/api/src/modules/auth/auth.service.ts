import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const petshop = await this.prisma.petshop.create({
      data: {
        name: dto.petshopName,
        slug: this.toSlug(dto.petshopName),
        phone: dto.petshopPhone,
        users: {
          create: {
            name: dto.ownerName,
            email: dto.email,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const user = petshop.users[0];
    return this.generateTokens(user.id, user.email, petshop.id, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.generateTokens(user.id, user.email, user.petshopId, user.role);
  }

  private generateTokens(
    userId: string,
    email: string,
    petshopId: string,
    role: string,
  ) {
    const payload = { sub: userId, email, petshopId, role };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret',
        expiresIn: '7d',
      }),
    };
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
