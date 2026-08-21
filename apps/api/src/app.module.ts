import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { DogsModule } from './modules/dogs/dogs.module';
import { ServicesModule } from './modules/services/services.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DogsModule,
    ServicesModule,
    AppointmentsModule,
    ReportsModule,
    WhatsAppModule,
    MetricsModule,
  ],
})
export class AppModule {}
