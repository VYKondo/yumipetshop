import { Module } from '@nestjs/common';
import { BullMQModule } from '@nestjs/bullmq';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppProcessor } from './whatsapp.processor';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [
    BullMQModule.registerQueue({
      name: 'whatsapp-reminder',
    }),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppProcessor, PrismaService],
})
export class WhatsAppModule {}
