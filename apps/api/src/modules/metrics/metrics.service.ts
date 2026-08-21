import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInDays,
} from 'date-fns';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(petshopId: string, query: MetricsQueryDto) {
    // Determine date range
    let startDate: Date;
    let endDate: Date;

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);

      // Validate that startDate <= endDate
      if (startDate > endDate) {
        throw new BadRequestException(
          'Start date must be before or equal to end date',
        );
      }
    } else if (query.period) {
      const now = new Date();
      switch (query.period) {
        case MetricsQueryDto.PERIOD_DAY:
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case MetricsQueryDto.PERIOD_WEEK:
          startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday as start of week
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case MetricsQueryDto.PERIOD_MONTH:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case MetricsQueryDto.PERIOD_YEAR:
          startDate = startOfMonth(new Date(now.getFullYear(), 0, 1)); // Jan 1
          endDate = endOfMonth(new Date(now.getFullYear(), 11, 31)); // Dec 31
          break;
        default:
          throw new BadRequestException('Invalid period specified');
      }
    } else {
      // Default to current month if nothing specified
      const now = new Date();
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    // Get appointments count and revenue
    const [appointmentsCount, totalRevenue, newClientsCount] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          petshopId,
          scheduledAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'DONE'], // Only count completed or confirmed appointments
          },
        },
      }),
      this.prisma.appointment.aggregate({
        where: {
          petshopId,
          scheduledAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'DONE'],
          },
        },
        _sum: {
          price: true,
          taxidogPrice: true,
        },
      }),
      this.prisma.dog.count({
        where: {
          petshopId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    const totalRevenueAmount =
      (totalRevenue._sum.price || 0) + (totalRevenue._sum.taxidogPrice || 0);

    // Get services performance
    const servicesPerformance = await this.prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        petshopId,
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'DONE'],
        },
      },
      _sum: {
        price: true,
        taxidogPrice: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          price: 'desc',
        },
      },
    });

    // Get service names for the performance data
    const serviceIds = servicesPerformance.map((sp) => sp.serviceId);
    const services = await this.prisma.service.findMany({
      where: {
        id: {
          in: serviceIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const servicesMap = new Map(
      services.map((service) => [service.id, service.name]),
    );

    const servicesData = servicesPerformance.map((sp) => ({
      serviceId: sp.serviceId,
      serviceName: servicesMap.get(sp.serviceId) || 'Serviço desconhecido',
      totalRevenue: (sp._sum.price || 0) + (sp._sum.taxidogPrice || 0),
      appointmentCount: sp._count,
      averagePrice:
        sp._count > 0
          ? ((sp._sum.price || 0) + (sp._sum.taxidogPrice || 0)) / sp._count
          : 0,
    }));

    // Get client growth (compare with previous period)
    const previousPeriodStart = new Date(
      startDate.getTime() - differenceInDays(endDate, startDate) * 24 * 60 * 60 * 1000,
    );
    const previousPeriodEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);

    const previousPeriodClients = await this.prisma.dog.count({
      where: {
        petshopId,
        createdAt: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
    });

    const clientGrowth =
      previousPeriodClients > 0
        ? ((newClientsCount - previousPeriodClients) / previousPeriodClients) * 100
        : newClientsCount > 0
        ? 100
        : 0;

    // Get revenue growth (compare with previous period)
    const previousPeriodRevenue = await this.prisma.appointment.aggregate({
      where: {
        petshopId,
        scheduledAt: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'DONE'],
        },
      },
      _sum: {
        price: true,
        taxidogPrice: true,
      },
    });

    const previousPeriodRevenueAmount =
      (previousPeriodRevenue._sum.price || 0) +
      (previousPeriodRevenue._sum.taxidogPrice || 0);

    const revenueGrowth =
      previousPeriodRevenueAmount > 0
        ? ((totalRevenueAmount - previousPeriodRevenueAmount) /
            previousPeriodRevenueAmount) *
          100
        : totalRevenueAmount > 0
        ? 100
        : 0;

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalRevenue: totalRevenueAmount,
        totalAppointments: appointmentsCount,
        newClients: newClientsCount,
        clientGrowth: parseFloat(clientGrowth.toFixed(2)),
        revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
      },
      services: servicesData,
    };
  }
}

// Add enum to DTO for backward compatibility
MetricsQueryDto.PERIOD_DAY = 'day';
MetricsQueryDto.PERIOD_WEEK = 'week';
MetricsQueryDto.PERIOD_MONTH = 'month';
MetricsQueryDto.PERIOD_YEAR = 'year';