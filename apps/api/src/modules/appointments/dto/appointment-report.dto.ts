import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export class AppointmentReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'year'])
  period?: 'day' | 'week' | 'month' | 'year';
}