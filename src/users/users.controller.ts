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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GemTransactionType } from './entities/gem-transaction.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    return this.usersService.create(createUserDto, req.user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.role);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.usersService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    return this.usersService.update(id, updateUserDto, req.user.userId, req.user.role);
  }

  @Get('leaderboard/gems/holders')
  @ApiOperation({ summary: 'Top gem holders' })
  @ApiResponse({ status: 200, description: 'Gem holders retrieved successfully' })
  async getTopGemHolders(@Query('limit') limit = 10, @Request() req: any) {
    return this.usersService.getTopGemHolders(Number(limit) || 10, req.user.role);
  }

  @Get('leaderboard/gems/spenders')
  @ApiOperation({ summary: 'Top gem spenders' })
  @ApiResponse({ status: 200, description: 'Gem spenders retrieved successfully' })
  async getTopGemSpenders(@Query('limit') limit = 10, @Request() req: any) {
    return this.usersService.getTopGemSpenders(Number(limit) || 10, req.user.role);
  }

  @Get('gems/history')
  @ApiOperation({ summary: 'Gem transaction history' })
  @ApiResponse({ status: 200, description: 'Gem transactions retrieved successfully' })
  async getGemTransactions(
    @Query('userId') userId: string,
    @Query('type') type: string,
    @Query('limit') limit = 20,
    @Request() req: any,
  ) {
    const normalizedType =
      type && Object.values(GemTransactionType).includes(type as GemTransactionType)
        ? (type as GemTransactionType)
        : undefined;

    return this.usersService.getGemTransactions({
      userId,
      type: normalizedType,
      limit: Number(limit) || 20,
    }, req.user.userId, req.user.role);
  }

  @Get('activities/recent')
  @ApiOperation({ summary: 'Get recent activities (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Recent activities retrieved successfully' })
  async getRecentActivities(
    @Query('limit') limit = 20,
    @Request() req: any,
  ) {
    return this.usersService.getRecentActivities(Number(limit) || 20, req.user.role);
  }

  @Get('activities/login')
  @ApiOperation({ summary: 'Get login activity chart data (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Login activity retrieved successfully' })
  async getLoginActivity(
    @Query('days') days = 7,
    @Request() req: any,
  ) {
    const daysNum = Number(days) || 7;
    // Ensure valid range (7, 30, or 90 days)
    const validDays = daysNum === 30 ? 30 : daysNum === 90 ? 90 : 7;
    return this.usersService.getLoginActivity(validDays, req.user.role);
  }

  @Get('activities/registration')
  @ApiOperation({ summary: 'Get registration activity chart data (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Registration activity retrieved successfully' })
  async getRegistrationActivity(
    @Query('days') days = 7,
    @Request() req: any,
  ) {
    const daysNum = Number(days) || 7;
    // Ensure valid range (7, 30, or 90 days)
    const validDays = daysNum === 30 ? 30 : daysNum === 90 ? 90 : 7;
    return this.usersService.getRegistrationActivity(validDays, req.user.role);
  }

  @Get('stats/dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboardStats(@Request() req: any) {
    return this.usersService.getDashboardStats(req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.usersService.remove(id, req.user.userId, req.user.role);
  }
}
