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
import { UserItemsService } from './user-items.service';
import { UserItemType } from './entities/user-item.entity';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userItemsService: UserItemsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    return this.usersService.create(createUserDto, req.user.role, req.user.email);
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
    return this.usersService.update(id, updateUserDto, req.user.userId, req.user.role, req.user.email);
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

  @Get('analytics/most-used-items')
  @ApiOperation({ summary: 'Get most used store items (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Most used items retrieved successfully' })
  async getMostUsedItems(@Query('limit') limit = 10, @Request() req: any) {
    return this.usersService.getMostUsedItems(Number(limit) || 10, req.user.role);
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

  @Get('items')
  @ApiOperation({ summary: 'Get user items (rewards from stamps)' })
  @ApiResponse({ status: 200, description: 'User items retrieved successfully' })
  async getUserItems(@Request() req: any) {
    return this.userItemsService.getUserItems(req.user.userId);
  }

  @Post('items/use')
  @ApiOperation({ summary: 'Use an item (decrement amount by 1)' })
  @ApiResponse({ status: 200, description: 'Item used successfully' })
  @ApiResponse({ status: 400, description: 'Not enough items' })
  async useItem(@Body() body: { itemType: string }, @Request() req: any) {
    // Map frontend item IDs to UserItemType enum
    // Frontend uses: 'backflip', 'character-boost', 'premium-boost'
    // Backend enum uses: 'backflip', 'choicePriority', 'rekallTokenAirdrop'
    const itemTypeMap: Record<string, UserItemType> = {
      'backflip': UserItemType.BACKFLIP,
      'character-boost': UserItemType.CHOICE_PRIORITY,
      'premium-boost': UserItemType.REKALL_TOKEN_AIRDROP,
    };
    
    const itemType = itemTypeMap[body.itemType];
    if (!itemType) {
      throw new BadRequestException(`Invalid item type: ${body.itemType}`);
    }
    
    const userItem = await this.userItemsService.getUserItem(req.user.userId, itemType);
    if (!userItem || userItem.amount <= 0) {
      throw new BadRequestException('You do not have this item');
    }
    
    // Decrement amount by 1 (pass negative amount to subtract)
    const updatedItem = await this.userItemsService.addItem(req.user.userId, itemType, -1, 'Used from store');
    
    return {
      success: true,
      itemType: body.itemType,
      remainingAmount: Math.max(0, updatedItem.amount), // Ensure non-negative
      message: 'Item used successfully',
    };
  }

  @Post('items/test/add')
  @ApiOperation({ summary: '[TEST ONLY] Add item to user by email' })
  @ApiResponse({ status: 200, description: 'Item added successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async addTestItem(@Body() body: { email: string; itemType: string; amount?: number }, @Request() req: any) {
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('This endpoint is only available in development environment');
    }

    const { email, itemType, amount = 1 } = body;
    
    // Find user by email using the service
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    // Map item types
    const itemTypeMap: Record<string, UserItemType> = {
      'backflip': UserItemType.BACKFLIP,
      'character-boost': UserItemType.CHOICE_PRIORITY,
      'premium-boost': UserItemType.REKALL_TOKEN_AIRDROP,
    };

    const mappedItemType = itemTypeMap[itemType];
    if (!mappedItemType) {
      throw new BadRequestException(`Invalid item type: ${itemType}. Valid types: backflip, character-boost, premium-boost`);
    }

    const result = await this.userItemsService.addItem(
      user.id,
      mappedItemType,
      amount,
      'Test item - added via test endpoint'
    );

    return {
      success: true,
      message: `Added ${amount} ${itemType} item(s) to ${email}`,
      user: {
        id: user.id,
        email: user.email,
      },
      item: {
        type: itemType,
        amount: result.amount,
      },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.usersService.remove(id, req.user.userId, req.user.role, req.user.email);
  }
}
