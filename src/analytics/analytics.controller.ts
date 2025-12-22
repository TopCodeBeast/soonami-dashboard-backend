import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('query')
  @ApiOperation({ summary: 'Query analytics data' })
  @ApiResponse({ status: 200, description: 'Analytics query successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async queryAnalytics(
    @Request() req: any,
    @Body() body: { message: string; user_id?: string },
  ) {
    const userId = body.user_id || req.user.id;
    const userRole = req.user.role;
    // Get the access token from the request headers (JWT token)
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    return this.analyticsService.queryAnalytics(userId, body.message, userRole, accessToken);
  }
}

