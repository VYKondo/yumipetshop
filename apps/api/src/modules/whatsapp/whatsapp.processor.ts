import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WhatsAppService } from './whatsapp.service';
import { Logger } from '@nestjs/common';

@Processor('whatsapp-reminder')
export class WhatsAppProcessor {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  @Process('check-reminders')
  async checkReminders(job: Job) {
    this.logger.log('Checking for appointment reminders...');
    try {
      await this.whatsappService.checkAndSendReminders();
      this.logger.log('Finished checking for appointment reminders.');
    } catch (error) {
      this.logger.error('Error checking for appointment reminders:', error);
      throw error;
    }
  }
}
