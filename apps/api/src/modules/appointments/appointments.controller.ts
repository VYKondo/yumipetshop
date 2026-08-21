import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentReportDto } from './dto/appointment-report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { StaffPermissionsGuard } from '../../common/guards/staff-permissions.guard';
import { CurrentPetshop } from '../../common/decorators/current-petshop.decorator';
import { AllowedResources } from '../../common/decorators/allowed-resources.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard, TenantGuard, StaffPermissionsGuard)
@AllowedResources('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(
    @CurrentPetshop() petshopId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(petshopId, dto);
  }

  @Get()
  findAll(@CurrentPetshop() petshopId: string) {
    return this.appointmentsService.findAll(petshopId);
  }

  @Get(':id')
  findOne(@CurrentPetshop() petshopId: string, @Param('id') id: string) {
    return this.appointmentsService.findOne(petshopId, id);
  }

  @Patch(':id')
  update(
    @CurrentPetshop() petshopId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(petshopId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentPetshop() petshopId: string, @Param('id') id: string) {
    return this.appointmentsService.remove(petshopId, id);
  }

  @Get('report/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="appointment-report.csv"')
  async generateCsvReport(
    @CurrentPetshop() petshopId: string,
    @Query() dto: AppointmentReportDto,
    @Res() res: Response
  ) {
    const csv = await this.appointmentsService.generateCsvReport(petshopId, dto);
    res.send(csv);
  }

  @Get('report/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="appointment-report.pdf"')
  async generatePdfReport(
    @CurrentPetshop() petshopId: string,
    @Query() dto: AppointmentReportDto,
    @Res() res: Response
  ) {
    const pdf = await this.appointmentsService.generatePdfReport(petshopId, dto);
    res.send(pdf);
  }
}
