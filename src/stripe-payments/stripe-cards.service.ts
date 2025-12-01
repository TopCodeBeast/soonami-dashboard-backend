import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeCard } from './entities/stripe-card.entity';
import { CreateStripeCardDto } from './dto/create-stripe-card.dto';
import { GetStripeCardsDto } from './dto/get-stripe-card.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class StripeCardsService {
  private readonly ADMIN_EMAIL = 'maxb47163@gmail.com';

  constructor(
    @InjectRepository(StripeCard)
    private readonly stripeCardRepository: Repository<StripeCard>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Save Stripe card details from Python project
   */
  async create(createStripeCardDto: CreateStripeCardDto): Promise<StripeCard> {
    // Try to find user by email or userId
    let user: User | null = null;
    if (createStripeCardDto.userId) {
      user = await this.userRepository.findOne({
        where: { id: createStripeCardDto.userId },
      });
    }
    if (!user && createStripeCardDto.userEmail) {
      user = await this.userRepository.findOne({
        where: { email: createStripeCardDto.userEmail },
      });
    }

    // Check if card with this session ID already exists
    const existing = await this.stripeCardRepository.findOne({
      where: { stripeSessionId: createStripeCardDto.stripeSessionId },
    });

    if (existing) {
      // Update existing record
      Object.assign(existing, {
        ...createStripeCardDto,
        userId: user?.id || existing.userId,
      });
      if (createStripeCardDto.paymentStatus === 'paid' && !existing.paidAt) {
        existing.paidAt = new Date();
      }
      return await this.stripeCardRepository.save(existing);
    }

    // Create new record
    const stripeCard = this.stripeCardRepository.create({
      ...createStripeCardDto,
      userId: user?.id || null,
      paymentStatus: createStripeCardDto.paymentStatus || 'pending',
      paidAt:
        createStripeCardDto.paymentStatus === 'paid' ? new Date() : null,
    });

    return await this.stripeCardRepository.save(stripeCard);
  }

  /**
   * Get all card details (only accessible by admin email)
   */
  async findAll(
    query: GetStripeCardsDto,
    requestEmail?: string,
  ): Promise<{ data: StripeCard[]; total: number; page: number; limit: number }> {
    // Check if requester is admin
    if (!requestEmail || requestEmail.toLowerCase() !== this.ADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException(
        'Access denied. Only maxb47163@gmail.com can access card details.',
      );
    }

    const { userEmail, stripeCustomerId, paymentStatus, page = 1, limit = 10 } = query;

    const queryBuilder = this.stripeCardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.user', 'user');

    if (userEmail) {
      queryBuilder.where('card.userEmail = :userEmail', { userEmail });
    }

    if (stripeCustomerId) {
      queryBuilder.andWhere('card.stripeCustomerId = :stripeCustomerId', {
        stripeCustomerId,
      });
    }

    if (paymentStatus) {
      queryBuilder.andWhere('card.paymentStatus = :paymentStatus', {
        paymentStatus,
      });
    }

    queryBuilder.orderBy('card.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single card by session ID (only accessible by admin email)
   */
  async findOne(
    stripeSessionId: string,
    requestEmail?: string,
  ): Promise<StripeCard> {
    // Check if requester is admin
    if (!requestEmail || requestEmail.toLowerCase() !== this.ADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException(
        'Access denied. Only maxb47163@gmail.com can access card details.',
      );
    }

    const card = await this.stripeCardRepository.findOne({
      where: { stripeSessionId },
      relations: ['user'],
    });

    if (!card) {
      throw new NotFoundException(
        `Card with session ID ${stripeSessionId} not found`,
      );
    }

    return card;
  }

  /**
   * Get cards by user email (only accessible by admin email or the user themselves)
   */
  async findByUserEmail(
    userEmail: string,
    requestEmail?: string,
  ): Promise<StripeCard[]> {
    // Check if requester is admin or the user themselves
    const isAdmin =
      requestEmail && requestEmail.toLowerCase() === this.ADMIN_EMAIL.toLowerCase();
    const isOwnEmail =
      requestEmail && requestEmail.toLowerCase() === userEmail.toLowerCase();

    if (!isAdmin && !isOwnEmail) {
      throw new ForbiddenException(
        'Access denied. You can only access your own card details or be an admin.',
      );
    }

    return await this.stripeCardRepository.find({
      where: { userEmail },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}

