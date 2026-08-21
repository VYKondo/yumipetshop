import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDogDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsString()
  @IsNotEmpty()
  tutorName: string;

  @IsString()
  @IsNotEmpty()
  tutorPhone: string;
}
