import { IsOptional, IsString } from 'class-validator';

export class UpdateDogDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsString()
  tutorName?: string;

  @IsOptional()
  @IsString()
  tutorPhone?: string;
}
