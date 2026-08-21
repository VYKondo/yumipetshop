import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  petshopName: string;

  @IsOptional()
  @IsString()
  petshopPhone?: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
