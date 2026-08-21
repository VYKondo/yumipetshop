import { Controller, Get, Query, UseGuards, Res, Header } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { EarningsReportDto } from './dto/earnings-report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { StaffPermissionsGuard } from '../../common/guards/staff-permissions.guard';
import { CurrentPetshop } from '../../common/decorators/current-petshop.decorator';
import { AllowedResources } from '../../common/decorators/allowed-resources.decorator';
import { Response } from 'express';

@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard, StaffPermissionsGuard)
@AllowedResources('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('earnings')
  getEarningsReport(
    @CurrentPetshop() petshopId: string,
    @Query() query: EarningsReportDto,
  ) {
    return this.reportsService.getEarningsReport(petshopId, query);
  }

  @Get('earnings/csv')
  async getEarningsReportCsv(
    @CurrentPetshop() petshopId: string,
    @Query() query: EarningsReportDto,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.generateCsvReport(petshopId, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=earnings-report.csv');
    res.send(csv);
  }

  @Get('earnings/pdf')
  async getEarningsReportPdf(
    @CurrentPetshop() petshopId: string,
    @Query() query: EarningsReportDto,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportsService.generatePdfReport(petshopId, query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=earnings-report.pdf');
    res.send(pdfBuffer);
  }
}
