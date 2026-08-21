import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: PrismaService;

  const mockPetshopId = 'petshop-1';
  const mockOtherPetshopId = 'petshop-2';
  const mockDogId = 'dog-1';
  const mockServiceId = 'service-1';

  // Existing appointment: 10:00 - 11:00 (60 min)
  const existingAppointment = {
    id: 'existing-1',
    petshopId: mockPetshopId,
    dogId: mockDogId,
    serviceId: mockServiceId,
    scheduledAt: new Date('2026-08-17T10:00:00Z'),
    durationMin: 60,
    price: 100,
    taxidogPrice: 10,
    notes: '',
    contactPhone: '123456789',
    status: 'SCHEDULED',
    whatsappReminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: PrismaService,
          useValue: {
            appointment: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an appointment without conflict', async () => {
      const dto: CreateAppointmentDto = {
        dogId: mockDogId,
        serviceId: mockServiceId,
        scheduledAt: new Date('2026-08-17T12:00:00Z'),
        durationMin: 60,
        price: 100,
        contactPhone: '123456789',
      };

      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.create as jest.Mock).mockResolvedValue({
        id: 'new-1',
        petshopId: mockPetshopId,
        ...dto,
        taxidogPrice: 0,
        notes: null,
        status: 'SCHEDULED',
        whatsappReminderSentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(mockPetshopId, dto);

      expect(result.id).toBe('new-1');
      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: { dogId: mockDogId, petshopId: mockPetshopId },
      });
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: { ...dto, petshopId: mockPetshopId },
      });
    });

    it('should throw BadRequestException on total overlap', async () => {
      const dto: CreateAppointmentDto = {
        dogId: mockDogId,
        serviceId: mockServiceId,
        scheduledAt: new Date('2026-08-17T10:00:00Z'),
        durationMin: 60,
        price: 100,
        contactPhone: '123456789',
      };

      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
        existingAppointment,
      ]);

      await expect(service.create(mockPetshopId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on partial overlap (start crosses)', async () => {
      // New: 09:30 - 10:30, Existing: 10:00 - 11:00 => overlap
      const dto: CreateAppointmentDto = {
        dogId: mockDogId,
        serviceId: mockServiceId,
        scheduledAt: new Date('2026-08-17T09:30:00Z'),
        durationMin: 60,
        price: 100,
        contactPhone: '123456789',
      };

      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
        existingAppointment,
      ]);

      await expect(service.create(mockPetshopId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on partial overlap (end crosses)', async () => {
      // New: 10:30 - 11:30, Existing: 10:00 - 11:00 => overlap
      const dto: CreateAppointmentDto = {
        dogId: mockDogId,
        serviceId: mockServiceId,
        scheduledAt: new Date('2026-08-17T10:30:00Z'),
        durationMin: 60,
        price: 100,
        contactPhone: '123456789',
      };

      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
        existingAppointment,
      ]);

      await expect(service.create(mockPetshopId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow back-to-back appointments (no overlap)', async () => {
      // Existing ends at 11:00, new starts at 11:00 => no overlap
      const dto: CreateAppointmentDto = {
        dogId: mockDogId,
        serviceId: mockServiceId,
        scheduledAt: new Date('2026-08-17T11:00:00Z'),
        durationMin: 60,
        price: 100,
        contactPhone: '123456789',
      };

      // DB returns the existing appointment, but overlap check should pass
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
        existingAppointment,
      ]);
      (prisma.appointment.create as jest.Mock).mockResolvedValue({
        id: 'new-2',
        petshopId: mockPetshopId,
        ...dto,
        taxidogPrice: 0,
        notes: null,
        status: 'SCHEDULED',
        whatsappReminderSentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(mockPetshopId, dto);
      expect(result.id).toBe('new-2');
      expect(prisma.appointment.create).toHaveBeenCalled();
    });

    it('should allow same time in different petshop (tenant isolation)', async () => {
      const dto: CreateAppointmentDto = {
        dogId: mockDogId,
        serviceId: mockServiceId,
        scheduledAt: new Date('2026-08-17T10:00:00Z'),
        durationMin: 60,
        price: 100,
        contactPhone: '123456789',
      };

      // No conflicts in this petshop (conflict is in another petshop)
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.create as jest.Mock).mockResolvedValue({
        id: 'new-3',
        petshopId: mockOtherPetshopId,
        ...dto,
        taxidogPrice: 0,
        notes: null,
        status: 'SCHEDULED',
        whatsappReminderSentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(mockOtherPetshopId, dto);
      expect(result.id).toBe('new-3');
      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: { dogId: mockDogId, petshopId: mockOtherPetshopId },
      });
    });
  });

  describe('update', () => {
    it('should update appointment without changing time (no self-conflict)', async () => {
      const dto: UpdateAppointmentDto = {
        price: 150,
        notes: 'Updated notes',
      };

      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(
        existingAppointment,
      );
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.update as jest.Mock).mockResolvedValue({
        ...existingAppointment,
        ...dto,
        updatedAt: new Date(),
      });

      const result = await service.update(
        mockPetshopId,
        existingAppointment.id,
        dto,
      );

      expect(result).toMatchObject({
        id: existingAppointment.id,
        price: 150,
        notes: 'Updated notes',
      });

      // Should exclude self from conflict check
      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          dogId: mockDogId,
          petshopId: mockPetshopId,
          NOT: { id: existingAppointment.id },
        },
      });
    });

    it('should throw BadRequestException when updating to conflicting time', async () => {
      const dto: UpdateAppointmentDto = {
        scheduledAt: new Date('2026-08-17T10:30:00Z'),
        durationMin: 60,
      };

      const otherAppointment = {
        ...existingAppointment,
        id: 'other-1',
        scheduledAt: new Date('2026-08-17T10:00:00Z'),
        durationMin: 60,
      };

      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(
        existingAppointment,
      );
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
        otherAppointment,
      ]);

      await expect(
        service.update(mockPetshopId, existingAppointment.id, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if appointment not found', async () => {
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(mockPetshopId, 'non-existent', { price: 200 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if appointment not found', async () => {
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.remove(mockPetshopId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
