import { IsEmail, IsString, MinLength, IsOptional, IsNumber, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsValidName } from '../utils/name-validator.decorator';

export class RequestCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class VerifyCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({ example: 'John Doe', required: false, maxLength: 40 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @IsValidName({ message: 'Name must be 40 characters or less, contain only letters, numbers, and spaces, and cannot contain inappropriate content' })
  name?: string;
}

export class CheckUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class DirectLoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', required: false, maxLength: 40 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @IsValidName({ message: 'Name must be 40 characters or less, contain only letters, numbers, and spaces, and cannot contain inappropriate content' })
  name?: string;

  @ApiProperty({ example: 100, required: false, description: 'Initial gem amount' })
  @IsOptional()
  @IsNumber()
  gem?: number;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123' })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
