import { Controller, Get, Post, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
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
}
