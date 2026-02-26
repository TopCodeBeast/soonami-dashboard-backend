import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 100, required: false, description: 'Initial gem amount' })
  @IsOptional()
  @IsNumber()
  gem?: number;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    example: 'Gem purchase checkout',
    required: false,
    description: 'Reason for gem balance change, used for transaction history',
  })
  @IsOptional()
  @IsString()
  gemTransactionReason?: string;

  @ApiProperty({
    example: '{"source":"python_backend","itemId":"premium-boost"}',
    required: false,
    description: 'Metadata for gem transaction (stored as stringified JSON)',
  })
  @IsOptional()
  @IsString()
  gemTransactionMetadata?: string;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'user@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 150, required: false, description: 'Gem amount' })
  @IsOptional()
  @IsNumber()
  gem?: number;

  @ApiProperty({ enum: UserRole, example: UserRole.USER, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    example: 'Store purchase: Premium Boost',
    required: false,
    description: 'Reason for gem balance change, used for transaction history',
  })
  @IsOptional()
  @IsString()
  gemTransactionReason?: string;

  @ApiProperty({
    example: '{"item_id":"premium-boost","cost":5}',
    required: false,
    description: 'Metadata for gem transaction (stored as stringified JSON)',
  })
  @IsOptional()
  @IsString()
  gemTransactionMetadata?: string;

  @ApiProperty({ required: false, description: 'Stability signal remaining minutes' })
  @IsOptional()
  @IsNumber()
  stabilitySignalRemainingMinutes?: number;

  @ApiProperty({ required: false, description: 'Stability signal full capacity (minutes)' })
  @IsOptional()
  @IsNumber()
  stabilitySignalFullCapacityMinutes?: number;

  @ApiProperty({ required: false, description: 'When signal timer was paused' })
  @IsOptional()
  @IsDateString()
  stabilitySignalPausedAt?: string;

  @ApiProperty({ required: false, description: 'Last activity timestamp for signal decay' })
  @IsOptional()
  @IsDateString()
  stabilitySignalLastActivityAt?: string;

  @ApiProperty({ required: false, description: 'Stability Signal (S) inventory count' })
  @IsOptional()
  @IsNumber()
  stabilitySignalS?: number;

  @ApiProperty({ required: false, description: 'Stability Signal (M) inventory count' })
  @IsOptional()
  @IsNumber()
  stabilitySignalM?: number;

  @ApiProperty({ required: false, description: 'Stability Signal (L) inventory count' })
  @IsOptional()
  @IsNumber()
  stabilitySignalL?: number;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ description: 'Gem amount' })
  gem: number;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  lastLoginAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  wallets: any[];
}
