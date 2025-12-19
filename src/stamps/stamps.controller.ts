import { Controller, Get, Post, UseGuards, Request, HttpCode, HttpStatus, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StampsService } from './stamps.service';
import { StampStatusResponseDto, ClaimStampResponseDto } from './dto/stamp.dto';

@ApiTags('Stamps')
@Controller('stamps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StampsController {
  constructor(private readonly stampsService: StampsService) {}

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim a stamp' })
  @ApiResponse({ status: 200, type: ClaimStampResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async claimStamp(@Request() req: any): Promise<ClaimStampResponseDto> {
    return this.stampsService.claimStamp(req.user.userId);
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current stamp collection status' })
  @ApiResponse({ status: 200, type: StampStatusResponseDto })
  async getStampStatus(@Request() req: any): Promise<StampStatusResponseDto> {
    return this.stampsService.getStampStatus(req.user.userId);
  }

  @Get('rewards')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user reward history' })
  @ApiResponse({ status: 200, description: 'List of stamp rewards' })
  async getRewardHistory(@Request() req: any) {
    return this.stampsService.getRewardHistory(req.user.userId);
  }

  @Post('setup-to-6/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set user stamps to 6 for testing (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Stamps set to 6 successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Manager access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async setupStampsTo6(
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.stampsService.setupStampsTo6(userId, req.user.role);
  }
}
