import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum MetricsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class MetricsQueryDto {
  @IsOptional()
  @IsEnum(MetricsPeriod)
  period?: MetricsPeriod;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}