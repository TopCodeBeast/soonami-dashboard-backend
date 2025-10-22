import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { CreateWalletDto, UpdateWalletDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Wallets')
@Controller('wallets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 409, description: 'Wallet address already exists' })
  async create(
    @Body() createWalletDto: CreateWalletDto,
    @Request() req: any,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = userId || req.user.userId;
    return this.walletsService.create(createWalletDto, targetUserId, req.user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Get wallets for a user' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Wallets retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  async findAll(@Request() req: any, @Query('userId') userId?: string) {
    const targetUserId = userId || req.user.userId;
    return this.walletsService.findAll(targetUserId, req.user.userId, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.walletsService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update wallet' })
  @ApiResponse({ status: 200, description: 'Wallet updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async update(
    @Param('id') id: string,
    @Body() updateWalletDto: UpdateWalletDto,
    @Request() req: any,
  ) {
    return this.walletsService.update(id, updateWalletDto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete wallet' })
  @ApiResponse({ status: 200, description: 'Wallet deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.walletsService.remove(id, req.user.userId, req.user.role);
  }
}
