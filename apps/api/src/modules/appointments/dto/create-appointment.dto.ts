import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsString()
  dogId: string;

  @IsNotEmpty()
  @IsString()
  serviceId: string;

  @IsNotEmpty()
  @Type(() => Date)
  scheduledAt: Date;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  durationMin: number;

  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsOptional()
  @Min(0)
  taxidogPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNotEmpty()
  @IsString()
  contactPhone: string;
}
