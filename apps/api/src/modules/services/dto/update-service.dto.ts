import { IsDecimal, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDecimal()
  basePrice?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultDurationMin?: string;

  @IsOptional()
  @IsString()
  active?: string;
}
