import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EarningsReportDto } from './dto/earnings-report.dto';
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
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async fetchReportData(petshopId: string, dto: EarningsReportDto) {
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

  async getEarningsReport(petshopId: string, dto: EarningsReportDto) {
    return this.fetchReportData(petshopId, dto);
  }

  async generateCsvReport(petshopId: string, dto: EarningsReportDto): Promise<string> {
    const report = await this.fetchReportData(petshopId, dto);
    const rows: any[][] = [];

    // Header
    rows.push(['Earnings Report']);
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

  async generatePdfReport(petshopId: string, dto: EarningsReportDto): Promise<Buffer> {
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
      doc.fontSize(20).text('Earnings Report', { align: 'center' });
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
}

// Helper function for differenceInDays (since we didn't import it earlier)
function differenceInDays(dateLeft: Date, dateRight: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const utcLeft = Date.UTC(dateLeft.getFullYear(), dateLeft.getMonth(), dateLeft.getDate());
  const utcRight = Date.UTC(dateRight.getFullYear(), dateRight.getMonth(), dateRight.getDate());
  return Math.floor((utcLeft - utcRight) / MS_PER_DAY);
}

// Add enum to DTO for backward compatibility
// Note: This is a workaround because the DTO is in a separate file.
// In a real application, we would import the enum from the DTO file.
// However, to avoid circular dependencies, we define it here as well.
// But note: the DTO file already has the enum. We are duplicating it.
// Alternatively, we could remove this and adjust the service to import the DTO.
// However, the service already imports the DTO, so we can use it.
// Let's remove this duplication and use the imported enum.
// Actually, we are not using the enum in this service except for the period string.
// We are using the string values directly from the dto.period.
// So we don't need the enum here.
// We'll remove the duplicate enum definition.