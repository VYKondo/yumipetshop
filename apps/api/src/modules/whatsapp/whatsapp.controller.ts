import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { CurrentPetshop } from '../auth/decorators/current-petshop.decorator';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, TenantGuard)
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('templates')
  createTemplate(
    @Body() dto: CreateMessageTemplateDto,
    @CurrentPetshop() petshopId: string,
  ) {
    return this.whatsappService.createTemplate(petshopId, dto);
  }

  @Get('templates')
  findTemplates(@CurrentPetshop() petshopId: string) {
    return this.whatsappService.findTemplates(petshopId);
  }

  @Get('templates/:id')
  findTemplate(@Param('id') id: string, @CurrentPetshop() petshopId: string) {
    return this.whatsappService.findTemplate(petshopId, id);
  }

  @Patch('templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateMessageTemplateDto,
    @CurrentPetshop() petshopId: string,
  ) {
    return this.whatsappService.updateTemplate(petshopId, id, dto);
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id') id: string, @CurrentPetshop() petshopId: string) {
    return this.whatsappService.removeTemplate(petshopId, id);
  }

  // Trigger sending reminder for a specific appointment (for testing/manual trigger)
  @Post('appointments/:id/reminder')
  sendReminder(
    @Param('id') appointmentId: string,
    @CurrentPetshop() petshopId: string,
  ) {
    return this.whatsappService.sendAppointmentReminder(petshopId, appointmentId);
  }
}
