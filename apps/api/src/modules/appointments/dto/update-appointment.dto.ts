import { IsOptional, IsString, IsInt, Min, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  dogId?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @Type(() => Date)
  scheduledAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMin?: number;

  @IsOptional()
  @Min(0)
  price?: number;

  @IsOptional()
  @Min(0)
  taxidogPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}
