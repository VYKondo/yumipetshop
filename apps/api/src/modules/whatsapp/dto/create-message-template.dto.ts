import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMessageTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  active?: boolean;
}
