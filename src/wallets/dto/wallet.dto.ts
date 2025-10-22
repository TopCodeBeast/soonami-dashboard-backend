import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletDto {
  @ApiProperty({ example: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6' })
  @IsString()
  @MinLength(42)
  address: string;

  @ApiProperty({ example: 'My Main Wallet', required: false })
  @IsString()
  @IsOptional()
  label?: string;
}

export class UpdateWalletDto {
  @ApiProperty({ example: 'My Updated Wallet', required: false })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class WalletResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  userId: string;
}
