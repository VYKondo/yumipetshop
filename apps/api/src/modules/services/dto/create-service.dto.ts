import {
  IsDecimal,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDecimal()
  basePrice: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  defaultDurationMin?: string;

  @IsOptional()
  @IsString()
  active?: string;
}
