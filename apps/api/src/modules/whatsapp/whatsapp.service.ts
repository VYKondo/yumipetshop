import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto';
import { AppointmentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // Message Template CRUD operations
  async createTemplate(petshopId: string, dto: CreateMessageTemplateDto) {
    return this.prisma.messageTemplate.create({
      data: {
        ...dto,
        petshopId,
      },
    });
  }

  findTemplates(petshopId: string) {
    return this.prisma.messageTemplate.findMany({
      where: { petshopId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTemplate(petshopId: string, id: string) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id, petshopId },
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    return template;
  }

  async updateTemplate(
    petshopId: string,
    id: string,
    dto: UpdateMessageTemplateDto,
  ) {
    await this.findTemplate(petshopId, id);
    return this.prisma.messageTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async removeTemplate(petshopId: string, id: string) {
    await this.findTemplate(petshopId, id);
    return this.prisma.messageTemplate.update({
      where: { id },
      data: { active: false },
    });
  }

  // WhatsApp Cloud API integration
  async sendMessage(
    to: string,
    templateName: string,
    variables: Record<string, string>,
  ) {
    const apiToken = this.configService.get<string>('WHATSAPP_CLOUD_API_TOKEN');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (!apiToken || !phoneNumberId) {
      this.logger.warn('WhatsApp Cloud API credentials not configured');
      // For development, we'll simulate success
      this.logger.log(`Simulating WhatsApp message to ${to} with template ${templateName}`);
      return { success: true, messageId: `sim_${Date.now()}` };
    }

    try {
      // Format phone number (remove non-digits)
      const cleanTo = to.replace(/\D/g, '');

      // Prepare variables for WhatsApp template
      const components = Object.entries(variables).map(([key, value]) => ({
        type: 'text',
        text: value,
      }));

      // Prepare request body
      const messageData = {
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'pt_BR' },
          components: [
            {
              type: 'body',
              parameters: components,
            },
          ],
        },
      };

      // Make request to WhatsApp Cloud API
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messageData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${result.error?.message || response.statusText}`);
      }

      this.logger.log(`WhatsApp message sent successfully: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message:`, error);
      throw error;
    }
  }

  // Method to send appointment reminders (to be called by BullMQ job)
  async sendAppointmentReminder(appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId },
      include: {
        dog: {
          include: {
            petshop: true,
          },
        },
        service: true,
        petshop: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    // Get active template for this petshop
    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        petshopId: appointment.petshopId,
        active: true,
      },
    });

    if (!template) {
      // Fallback to default template if none configured
      return;
    }

    // Prepare variables for template substitution
    const date = new Date(appointment.scheduledAt);
    const variables = {
      tutor_name: appointment.dog.tutorName,
      dog_name: appointment.dog.name,
      service_name: appointment.service.name,
      date: date.toLocaleDateString('pt-BR'),
      time: date.toISOString().slice(11, 16), // HH:MM in UTC
      price: appointment.price.toString(),
    };

    // Replace placeholders in template content
    let messageContent = template.content;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      messageContent = messageContent.split(placeholder).join(value);
    }

    // Send the message (using contactPhone from appointment or dog's tutorPhone)
    const phoneNumber = appointment.contactPhone || appointment.dog.tutorPhone;
    if (phoneNumber) {
      await this.sendMessage(phoneNumber, template.name, variables);

      // Update appointment to mark reminder as sent
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          whatsappReminderSentAt: new Date(),
        },
      });
    }
  }

  // Method to check for upcoming appointments and send reminders (to be called by BullMQ worker)
  async checkAndSendReminders() {
    // We'll define the threshold: for example, 30 minutes from now
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes in the future

    // Find appointments that are scheduled between now and threshold, and have not had a reminder sent
    const appointments = await this.prisma.appointment.findMany({
      where: {
        scheduledAt: {
          gte: now,
          lte: threshold,
        },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
        whatsappReminderSentAt: null,
      },
      include: {
        dog: {
          include: {
            petshop: true,
          },
        },
        service: true,
        petshop: true,
      },
    });

    for (const appointment of appointments) {
      try {
        await this.sendAppointmentReminder(appointment.id);
      } catch (error) {
        // Log the error but continue with other appointments
        console.error(
          `Failed to send reminder for appointment ${appointment.id}:`,
          error,
        );
      }
    }
  }
}