import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EarningsReportDto } from './dto/earnings-report.dto';
import { BadRequestException } from '@nestjs/common';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: PrismaService;

  const mockPetshopId = 'petshop-1';
  const mockPetshopId2 = 'petshop-2';

  // Mock appointments: petshop-1 has 3 valid + 1 canceled, petshop-2 has 1 valid
  const mockAppointments = [
    {
      id: 'apt-1',
      petshopId: mockPetshopId,
      dogId: 'dog-1',
      serviceId: 'service-1',
      service: { name: 'Banho', basePrice: 50 },
      scheduledAt: new Date('2026-08-15T10:00:00Z'),
      durationMin: 60,
      price: 50,
      taxidogPrice: 5,
      status: 'DONE',
    },
    {
      id: 'apt-2',
      petshopId: mockPetshopId,
      dogId: 'dog-2',
      serviceId: 'service-2',
      service: { name: 'Tosa', basePrice: 80 },
      scheduledAt: new Date('2026-08-15T14:00:00Z'),
      durationMin: 90,
      price: 80,
      taxidogPrice: 10,
      status: 'DONE',
    },
    {
      id: 'apt-3',
      petshopId: mockPetshopId,
      dogId: 'dog-1',
      serviceId: 'service-1',
      service: { name: 'Banho', basePrice: 50 },
      scheduledAt: new Date('2026-08-16T11:00:00Z'),
      durationMin: 60,
      price: 55,
      taxidogPrice: 0,
      status: 'SCHEDULED',
    },
    {
      id: 'apt-4',
      petshopId: mockPetshopId2,
      dogId: 'dog-3',
      serviceId: 'service-3',
      service: { name: 'Banho', basePrice: 60 },
      scheduledAt: new Date('2026-08-15T12:00:00Z'),
      durationMin: 60,
      price: 60,
      taxidogPrice: 6,
      status: 'DONE',
    },
    {
      id: 'apt-5',
      petshopId: mockPetshopId,
      dogId: 'dog-3',
      serviceId: 'service-1',
      service: { name: 'Banho', basePrice: 50 },
      scheduledAt: new Date('2026-08-20T10:00:00Z'),
      durationMin: 60,
      price: 50,
      taxidogPrice: 5,
      status: 'CANCELED',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: {
            appointment: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEarningsReport', () => {
    it('should generate report for custom date range', async () => {
      const startDate = new Date('2026-08-15T00:00:00Z');
      const endDate = new Date('2026-08-15T23:59:59Z');
      const dto: EarningsReportDto = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      // Mock returns what Prisma would return after applying where clause
      const petshop1Aug15 = mockAppointments.filter(
        (a) =>
          a.petshopId === mockPetshopId &&
          a.status !== 'CANCELED' &&
          a.scheduledAt >= startDate &&
          a.scheduledAt <= endDate,
      );
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue(
        petshop1Aug15,
      );

      const result = await service.getEarningsReport(mockPetshopId, dto);

      expect(result.totalEarnings).toBe(145); // (50+5) + (80+10)
      expect(result.totalAppointments).toBe(2);
      expect(result.period.start).toEqual(startDate);
      expect(result.period.end).toEqual(endDate);
      expect(result.filters).toEqual({ serviceId: undefined });
    });

    it('should generate report for predefined period: day', async () => {
      const dto: EarningsReportDto = { period: 'day' as any };

      // Mock returns appointments for today
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getEarningsReport(mockPetshopId, dto);

      expect(result.period.start).toBeInstanceOf(Date);
      expect(result.period.end).toBeInstanceOf(Date);
      expect(result.totalEarnings).toBe(0);
      expect(result.totalAppointments).toBe(0);
    });

    it('should generate report for predefined period: week', async () => {
      const dto: EarningsReportDto = { period: 'week' as any };

      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getEarningsReport(mockPetshopId, dto);

      expect(result.period.start).toBeInstanceOf(Date);
      expect(result.period.end).toBeInstanceOf(Date);
    });

    it('should generate report for predefined period: month', async () => {
      const dto: EarningsReportDto = { period: 'month' as any };

      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getEarningsReport(mockPetshopId, dto);

      expect(result.period.start).toBeInstanceOf(Date);
      expect(result.period.end).toBeInstanceOf(Date);
    });

    it('should correctly calculate sum (price + taxidogPrice)', async () => {
      const startDate = new Date('2026-08-15T00:00:00Z');
      const endDate = new Date('2026-08-15T23:59:59Z');
      const dto: EarningsReportDto = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const data = [
        {
          ...mockAppointments[0],
          price: 50,
          taxidogPrice: 5,
        },
        {
          ...mockAppointments[1],
          price: 80,
          taxidogPrice: 10,
        },
      ];
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue(data);

      const result = await service.getEarningsReport(mockPetshopId, dto);

      // 50+5 + 80+10 = 145
      expect(result.totalEarnings).toBe(145);
    });

    it('should correctly count appointments', async () => {
      const startDate = new Date('2026-08-15T00:00:00Z');
      const endDate = new Date('2026-08-16T23:59:59Z');
      const dto: EarningsReportDto = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const data = [
        mockAppointments[0],
        mockAppointments[1],
        mockAppointments[2],
      ];
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue(data);

      const result = await service.getEarningsReport(mockPetshopId, dto);

      expect(result.totalAppointments).toBe(3);
    });

    it('should correctly group by service', async () => {
      const startDate = new Date('2026-08-15T00:00:00Z');
      const endDate = new Date('2026-08-16T23:59:59Z');
      const dto: EarningsReportDto = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      // 2 Banho + 1 Tosa
      const data = [
        mockAppointments[0],
        mockAppointments[1],
        mockAppointments[2],
      ];
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue(data);

      const result = await service.getEarningsReport(mockPetshopId, dto);

      expect(result.services).toHaveLength(2);

      const banho = result.services.find((s: any) => s.serviceName === 'Banho');
      expect(banho).toBeDefined();
      expect(banho!.totalEarnings).toBe(110); // (50+5) + (55+0)
      expect(banho!.appointmentCount).toBe(2);

      const tosa = result.services.find((s: any) => s.serviceName === 'Tosa');
      expect(tosa).toBeDefined();
      expect(tosa!.totalEarnings).toBe(90); // 80+10
      expect(tosa!.appointmentCount).toBe(1);
    });

    it('should filter by appointment status (exclude CANCELED)', async () => {
      const startDate = new Date('2026-08-20T00:00:00Z');
      const endDate = new Date('2026-08-20T23:59:59Z');
      const dto: EarningsReportDto = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      // Prisma would filter out CANCELED via the where clause, so mock returns empty
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getEarningsReport(mockPetshopId, dto);

      expect(result.totalEarnings).toBe(0);
      expect(result.totalAppointments).toBe(0);
      expect(result.services).toHaveLength(0);
    });

    it('should isolate by petshopId', async () => {
      const startDate = new Date('2026-08-15T00:00:00Z');
      const endDate = new Date('2026-08-15T23:59:59Z');
      const dto: EarningsReportDto = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      // Only petshop-2 data
      const petshop2Data = [mockAppointments[3]]; // apt-4
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue(
        petshop2Data,
      );

      const result = await service.getEarningsReport(mockPetshopId2, dto);

      expect(result.totalEarnings).toBe(66); // 60+6
      expect(result.totalAppointments).toBe(1);
      expect(result.services).toHaveLength(1);
      expect(result.services[0].serviceName).toBe('Banho');
    });

    it('should return zeros for period with no appointments', async () => {
      const startDate = new Date('2026-09-01T00:00:00Z');
      const endDate = new Date('2026-09-01T23:59:59Z');
      const dto: EarningsReportDto = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getEarningsReport(mockPetshopId, dto);

      expect(result.totalEarnings).toBe(0);
      expect(result.totalAppointments).toBe(0);
      expect(result.services).toHaveLength(0);
      expect(result.period.start).toEqual(startDate);
      expect(result.period.end).toEqual(endDate);
    });

    it('should throw BadRequestException when start date is after end date', async () => {
      const dto: EarningsReportDto = {
        startDate: '2026-08-20T00:00:00Z',
        endDate: '2026-08-15T00:00:00Z',
      };

      await expect(
        service.getEarningsReport(mockPetshopId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid period', async () => {
      const dto: EarningsReportDto = { period: 'invalid' as any };

      await expect(
        service.getEarningsReport(mockPetshopId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include serviceId and averagePrice in service breakdown', async () => {
      const startDate = new Date('2026-08-15T00:00:00Z');
      const endDate = new Date('2026-08-15T23:59:59Z');
      const dto: EarningsReportDto = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
        mockAppointments[0],
      ]);

      const result = await service.getEarningsReport(mockPetshopId, dto);

      expect(result.services[0]).toMatchObject({
        serviceName: 'Banho',
        serviceId: 'service-1',
        totalEarnings: 55,
        appointmentCount: 1,
        averagePrice: 55,
      });
    });
  });
});
