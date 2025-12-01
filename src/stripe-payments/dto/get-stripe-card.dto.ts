import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetStripeCardsDto {
  @ApiPropertyOptional({
    description: 'User email to filter by',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsOptional()
  userEmail?: string;

  @ApiPropertyOptional({
    description: 'Stripe customer ID to filter by',
    example: 'cus_test_1234567890',
  })
  @IsString()
  @IsOptional()
  stripeCustomerId?: string;

  @ApiPropertyOptional({
    description: 'Payment status to filter by',
    example: 'paid',
    enum: ['pending', 'paid', 'failed', 'canceled', 'refunded'],
  })
  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @ApiPropertyOptional({
    description: 'Page number (for pagination)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}

