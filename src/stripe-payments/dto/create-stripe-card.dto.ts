import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsObject,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateStripeCardDto {
  @ApiProperty({
    description: 'Stripe checkout session ID',
    example: 'cs_test_a1b2c3d4e5f6g7h8i9j0',
  })
  @IsString()
  @MinLength(1)
  stripeSessionId: string;

  @ApiPropertyOptional({
    description: 'Stripe payment intent ID',
    example: 'pi_test_1234567890',
  })
  @IsString()
  @IsOptional()
  stripePaymentIntentId?: string;

  @ApiPropertyOptional({
    description: 'Stripe customer ID',
    example: 'cus_test_1234567890',
  })
  @IsString()
  @IsOptional()
  stripeCustomerId?: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  userEmail: string;

  @ApiPropertyOptional({
    description: 'User ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 10000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'usd',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency: string;

  @ApiPropertyOptional({
    description: 'Last 4 digits of the card',
    example: '4242',
  })
  @IsString()
  @IsOptional()
  @MinLength(4)
  @MaxLength(4)
  cardLast4?: string;

  @ApiPropertyOptional({
    description: 'Card brand',
    example: 'visa',
    enum: ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners', 'unionpay', 'unknown'],
  })
  @IsString()
  @IsOptional()
  cardBrand?: string;

  @ApiPropertyOptional({
    description: 'Card expiry month (1-12)',
    example: 12,
    minimum: 1,
    maximum: 12,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  cardExpMonth?: number;

  @ApiPropertyOptional({
    description: 'Card expiry year (4 digits)',
    example: 2025,
    minimum: 2020,
    maximum: 2100,
  })
  @IsNumber()
  @IsOptional()
  @Min(2020)
  @Max(2100)
  cardExpYear?: number;

  @ApiPropertyOptional({
    description: 'Card funding type',
    example: 'credit',
    enum: ['credit', 'debit', 'prepaid', 'unknown'],
  })
  @IsString()
  @IsOptional()
  cardFunding?: string;

  @ApiPropertyOptional({
    description: 'Card country (ISO 3166-1 alpha-2)',
    example: 'US',
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(2)
  cardCountry?: string;

  @ApiPropertyOptional({
    description: 'Payment status',
    example: 'paid',
    enum: ['pending', 'paid', 'failed', 'canceled', 'refunded'],
  })
  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { user_id: '123', quantity: '100' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Stripe metadata',
    example: { checkout_session: 'cs_test_...' },
  })
  @IsObject()
  @IsOptional()
  stripeMetadata?: Record<string, any>;
}

