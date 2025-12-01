import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StripeCardsService } from './stripe-cards.service';
import { CreateStripeCardDto } from './dto/create-stripe-card.dto';
import { GetStripeCardsDto } from './dto/get-stripe-card.dto';

@ApiTags('stripe-cards')
@Controller('stripe-cards')
export class StripeCardsController {
  constructor(private readonly stripeCardsService: StripeCardsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save Stripe card details from Python project' })
  @ApiResponse({
    status: 201,
    description: 'Card details saved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createStripeCardDto: CreateStripeCardDto) {
    return await this.stripeCardsService.create(createStripeCardDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all card details (Admin only - maxb47163@gmail.com)',
    description:
      'Retrieve all stored card details. Only accessible by maxb47163@gmail.com',
  })
  @ApiResponse({
    status: 200,
    description: 'List of card details',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(@Query() query: GetStripeCardsDto, @Request() req: any) {
    const userEmail = req.user?.email;
    return await this.stripeCardsService.findAll(query, userEmail);
  }

  @Get('by-email/:email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get cards by user email',
    description:
      'Get all cards for a specific user. Accessible by admin or the user themselves.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of card details for the user',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findByUserEmail(@Param('email') email: string, @Request() req: any) {
    const requestEmail = req.user?.email;
    return await this.stripeCardsService.findByUserEmail(email, requestEmail);
  }

  @Get(':sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get card details by session ID (Admin only)',
    description:
      'Retrieve card details by Stripe session ID. Only accessible by maxb47163@gmail.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Card details',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async findOne(@Param('sessionId') sessionId: string, @Request() req: any) {
    const userEmail = req.user?.email;
    return await this.stripeCardsService.findOne(sessionId, userEmail);
  }
}

