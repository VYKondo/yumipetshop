import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentReportDto } from './dto/appointment-report.dto';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { stringify } from 'csv-stringify';
import { PDFDocument } from 'pdfkit';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  private async fetchReportData(petshopId: string, dto: AppointmentReportDto) {
    // Validate date range
    let startDate: Date;
    let endDate: Date;

    if (dto.startDate && dto.endDate) {
      startDate = new Date(dto.startDate);
      endDate = new Date(dto.endDate);

      // Validate that startDate <= endDate
      if (startDate > endDate) {
        throw new BadRequestException(
          'Start date must be before or equal to end date',
        );
      }
    } else if (dto.period) {
      const now = new Date();
      switch (dto.period) {
        case 'day':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'week':
          startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday as start of week
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'year':
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
    const [appointmentsCount, totalRevenue, newDogsCount] = await Promise.all([
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

    const previousPeriodDogs = await this.prisma.dog.count({
      where: {
        petshopId,
        createdAt: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
    });

    const clientGrowth =
      previousPeriodDogs > 0
        ? ((newDogsCount - previousPeriodDogs) / previousPeriodDogs) * 100
        : newDogsCount > 0
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
        newClients: newDogsCount,
        clientGrowth: parseFloat(clientGrowth.toFixed(2)),
        revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
      },
      services: servicesData,
    };
  }

  private async generateCsvReportInternal(petshopId: string, dto: AppointmentReportDto): Promise<string> {
    const report = await this.fetchReportData(petshopId, dto);
    const rows: any[][] = [];

    // Header
    rows.push(['Appointment Report']);
    rows.push([
      `Period:`,
      `${format(report.period.start, 'yyyy-MM-dd')} to ${format(report.period.end, 'yyyy-MM-dd')}`,
    ]);
    rows.push([]); // blank line

    // Summary section
    rows.push(['Summary']);
    rows.push(['Metric', 'Value']);
    rows.push(['Total Revenue', report.summary.totalRevenue]);
    rows.push(['Total Appointments', report.summary.totalAppointments]);
    rows.push(['New Clients', report.summary.newClients]);
    rows.push(['Client Growth (%)', report.summary.clientGrowth]);
    rows.push(['Revenue Growth (%)', report.summary.revenueGrowth]);
    rows.push([]); // blank line

    // Services section
    rows.push(['Services Report']);
    rows.push([
      'Service ID',
      'Service Name',
      'Total Revenue',
      'Appointment Count',
      'Average Price',
    ]);
    for (const service of report.services) {
      rows.push([
        service.serviceId,
        service.serviceName,
        service.totalRevenue,
        service.appointmentCount,
        service.averagePrice,
      ]);
    }

    return new Promise((resolve, reject) => {
      stringify(rows, { header: false }, (err, output) => {
        if (err) return reject(err);
        resolve(output);
      });
    });
  }

  private async generatePdfReportInternal(petshopId: string, dto: AppointmentReportDto): Promise<Buffer> {
    const report = await this.fetchReportData(petshopId, dto);
    const doc = new PDFDocument({ margin: 50 });
    const chunks: any[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text('Appointment Report', { align: 'center' });
      doc.moveDown();

      // Period
      doc
        .fontSize(12)
        .text(
          `Period: ${format(report.period.start, 'yyyy-MM-dd')} to ${format(report.period.end, 'yyyy-MM-dd')}`,
          { align: 'center' }
        );
      doc.moveDown(2);

      // Summary section
      doc.fontSize(16).text('Summary', { underline: true });
      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Total Revenue: $${report.summary.totalRevenue.toFixed(2)}`);
      doc.text(`Total Appointments: ${report.summary.totalAppointments}`);
      doc.text(`New Clients: ${report.summary.newClients}`);
      doc.text(`Client Growth: ${report.summary.clientGrowth}%`);
      doc.text(`Revenue Growth: ${report.summary.revenueGrowth}%`);
      doc.moveDown(2);

      // Services section
      doc.fontSize(16).text('Services Performance', { underline: true });
      doc.moveDown();

      // Table header
      const tableTop = doc.y;
      doc
        .fontSize(12)
        .text('Service ID', 50, tableTop, { width: 80 })
        .text('Service Name', 150, tableTop, { width: 150 })
        .text('Total Revenue', 320, tableTop, { width: 80, align: 'right' })
        .text('Appointment Count', 420, tableTop, { width: 100, align: 'right' })
        .text('Average Price', 540, tableTop, { width: 80, align: 'right' });

      doc.moveDown(0.5);
      doc.lineWidth(1).strokeColor('#ccc').line(50, doc.y + 5, 580, doc.y + 5).stroke();

      // Table rows
      let y = doc.y + 15;
      for (const service of report.services) {
        doc
          .fontSize(10)
          .text(service.serviceId, 50, y, { width: 80 })
          .text(service.serviceName, 150, y, { width: 150 })
          .text(
            `$${service.totalRevenue.toFixed(2)}`,
            320,
            y,
            { width: 80, align: 'right' }
          )
          .text(service.appointmentCount.toString(), 420, y, {
            width: 100,
            align: 'right',
          })
          .text(
            `$${service.averagePrice.toFixed(2)}`,
            540,
            y,
            { width: 80, align: 'right' }
          );
        y += 20;
        doc.moveDown(0.5);
      }

      doc.end();
    });
  }

  private isOverlap(
    startA: Date,
    durationA: number,
    startB: Date,
    durationB: number,
  ): boolean {
    const endA = new Date(startA.getTime() + durationA * 60000);
    const endB = new Date(startB.getTime() + durationB * 60000);
    return startA < endB && startB < endA;
  }

  private async getAppointmentData(
    petshopId: string,
    id: string | undefined,
    dto: CreateAppointmentDto | UpdateAppointmentDto,
  ): Promise<{ dogId: string; scheduledAt: Date; durationMin: number }> {
    if (id === undefined) {
      // Create case
      return {
        dogId: dto.dogId,
        scheduledAt: new Date(dto.scheduledAt),
        durationMin: dto.durationMin,
      };
    }

    // Update case: fetch existing appointment
    const existing = await this.prisma.appointment.findFirst({
      where: { id, petshopId },
    });
    if (!existing) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return {
      dogId: dto.dogId ?? existing.dogId,
      scheduledAt: dto.scheduledAt
        ? new Date(dto.scheduledAt)
        : existing.scheduledAt,
      durationMin: dto.durationMin ?? existing.durationMin,
    };
  }

  async create(petshopId: string, dto: CreateAppointmentDto) {
    const { dogId, scheduledAt, durationMin } = await this.getAppointmentData(
      petshopId,
      undefined,
      dto,
    );

    // Check for conflicts for the same dog within the same petshop
    const conflictingAppointments = await this.prisma.appointment.findMany({
      where: {
        dogId,
        petshopId,
      },
    });

    for (const appt of conflictingAppointments) {
      if (
        this.isOverlap(
          scheduledAt,
          durationMin,
          appt.scheduledAt,
          appt.durationMin,
        )
      ) {
        throw new BadRequestException(
          `Conflito de horário: o cão já tem um agendamento nesse período.`,
        );
      }
    }

    return this.prisma.appointment.create({
      data: {
        ...dto,
        petshopId,
      },
    });
  }

  findAll(petshopId: string) {
    return this.prisma.appointment.findMany({
      where: { petshopId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        dog: true,
        service: true,
      },
    });
  }

  async findOne(petshopId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, petshopId },
      include: {
        dog: true,
        service: true,
      },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    return appointment;
  }

  async update(petshopId: string, id: string, dto: UpdateAppointmentDto) {
    const { dogId, scheduledAt, durationMin } = await this.getAppointmentData(
      petshopId,
      id,
      dto,
    );

    // Check for conflicts for the same dog within the same petshop, excluding the current appointment
    const conflictingAppointments = await this.prisma.appointment.findMany({
      where: {
        dogId,
        petshopId,
        NOT: { id },
      },
    });

    for (const appt of conflictingAppointments) {
      if (
        this.isOverlap(
          scheduledAt,
          durationMin,
          appt.scheduledAt,
          appt.durationMin,
        )
      ) {
        throw new BadRequestException(
          `Conflito de horário: o cão já tem um agendamento nesse período.`,
        );
      }
    }

    return this.prisma.appointment.update({
      where: { id },
      data: dto,
    });
  }

  async remove(petshopId: string, id: string) {
    await this.findOne(petshopId, id);
    return this.prisma.appointment.delete({ where: { id } });
  }

  async getAppointmentReport(petshopId: string, dto: AppointmentReportDto) {
    return this.fetchReportData(petshopId, dto);
  }

  async generateCsvReport(petshopId: string, dto: AppointmentReportDto): Promise<string> {
    return this.generateCsvReportInternal(petshopId, dto);
  }

  async generatePdfReport(petshopId: string, dto: AppointmentReportDto): Promise<Buffer> {
    return this.generatePdfReportInternal(petshopId, dto);
  }
}
