import { IsString, IsOptional } from 'class-validator';

export class UpdateMessageTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  active?: boolean;
}
