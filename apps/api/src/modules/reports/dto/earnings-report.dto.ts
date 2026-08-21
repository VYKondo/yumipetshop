import { IsEnum, IsOptional } from 'class-validator';
import { IsDateString } from 'class-validator';

export enum ReportPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class EarningsReportDto {
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  serviceId?: string;
}
