import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeCard } from './entities/stripe-card.entity';
import { CreateStripeCardDto } from './dto/create-stripe-card.dto';
import { GetStripeCardsDto } from './dto/get-stripe-card.dto';
import { User } from '../users/entities/user.entity';
import Stripe from 'stripe';

@Injectable()
export class StripeCardsService {
  private readonly ADMIN_EMAIL = 'maxb47163@gmail.com';
  private stripe: Stripe | null = null;

  constructor(
    @InjectRepository(StripeCard)
    private readonly stripeCardRepository: Repository<StripeCard>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    // Initialize Stripe client
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_TEST;
    if (stripeSecretKey && stripeSecretKey.trim() !== '') {
      this.stripe = new Stripe(stripeSecretKey);
      console.log('✅ Stripe client initialized successfully');
    } else {
      console.warn('⚠️ Stripe client not initialized: STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST not found in environment variables');
    }
  }

  /**
   * Save Stripe card details from Python project
   * Supports multiple cards per user - each payment session creates a new card record
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
   * Returns all cards for a user, supporting multiple cards per user
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

    // Return all cards for this user (multiple cards per user supported)
    return await this.stripeCardRepository.find({
      where: { userEmail },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get card statistics grouped by user (Admin only)
   * Returns user email, card count, total amount, and latest card date
   */
  async getCardStatistics(
    requestEmail?: string,
  ): Promise<Array<{ userEmail: string; cardCount: number; totalAmount: number; latestCardDate: Date | null }>> {
    // Check if requester is admin
    if (!requestEmail || requestEmail.toLowerCase() !== this.ADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException(
        'Access denied. Only maxb47163@gmail.com can access card statistics.',
      );
    }

    // Get all cards grouped by user email
    const cards = await this.stripeCardRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Group by user email
    const userStats = new Map<string, { cardCount: number; totalAmount: number; latestCardDate: Date | null }>();
    
    for (const card of cards) {
      const email = card.userEmail;
      if (!userStats.has(email)) {
        userStats.set(email, {
          cardCount: 0,
          totalAmount: 0,
          latestCardDate: null,
        });
      }
      
      const stats = userStats.get(email)!;
      stats.cardCount += 1;
      stats.totalAmount += parseFloat(card.amount.toString());
      
      if (!stats.latestCardDate || card.createdAt > stats.latestCardDate) {
        stats.latestCardDate = card.createdAt;
      }
    }

    // Convert to array and sort by card count (descending)
    return Array.from(userStats.entries())
      .map(([userEmail, stats]) => ({
        userEmail,
        ...stats,
      }))
      .sort((a, b) => b.cardCount - a.cardCount);
  }

  /**
   * Get the appropriate Stripe client based on session ID (test vs live)
   */
  private getStripeClientForSession(sessionId: string): Stripe | null {
    const isTestSession = sessionId.startsWith('cs_test_') || sessionId.startsWith('pi_test_');
    
    if (isTestSession) {
      // For test sessions, prefer test key
      const testKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
      if (testKey && testKey.trim() !== '' && testKey.startsWith('sk_test_')) {
        return new Stripe(testKey);
      }
    } else {
      // For live sessions, use live key
      const liveKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_TEST;
      if (liveKey && liveKey.trim() !== '' && liveKey.startsWith('sk_live_')) {
        return new Stripe(liveKey);
      }
    }
    
    // Fallback to default client
    return this.stripe;
  }

  /**
   * Get full card details from Stripe API (Admin only)
   * Retrieves billing address, customer name, and all available information
   */
  async getFullCardDetails(
    stripeSessionId: string,
    requestEmail?: string,
  ): Promise<any> {
    // Check if requester is admin
    if (!requestEmail || requestEmail.toLowerCase() !== this.ADMIN_EMAIL.toLowerCase()) {
      throw new ForbiddenException(
        'Access denied. Only maxb47163@gmail.com can access card details.',
      );
    }

    // Get the appropriate Stripe client for this session
    const stripeClient = this.getStripeClientForSession(stripeSessionId);
    
    if (!stripeClient) {
      const isTestSession = stripeSessionId.startsWith('cs_test_') || stripeSessionId.startsWith('pi_test_');
      const keyType = isTestSession ? 'STRIPE_SECRET_KEY_TEST (sk_test_...)' : 'STRIPE_SECRET_KEY (sk_live_...)';
      throw new Error(
        `Stripe is not configured for ${isTestSession ? 'test' : 'live'} sessions. ` +
        `Please set ${keyType} in your .env file.`
      );
    }

    try {
      // Get stored card record
      const card = await this.stripeCardRepository.findOne({
        where: { stripeSessionId },
        relations: ['user'],
      });

      if (!card) {
        throw new NotFoundException(
          `Card with session ID ${stripeSessionId} not found`,
        );
      }

      // Retrieve full details from Stripe using the appropriate client
      let session: Stripe.Checkout.Session;
      try {
        session = await stripeClient.checkout.sessions.retrieve(stripeSessionId, {
          expand: ['payment_intent', 'customer', 'payment_intent.payment_method'],
        });
      } catch (stripeError: any) {
        // Check if it's a resource_missing error (session doesn't exist or wrong mode)
        if (stripeError.code === 'resource_missing') {
          const isTestSession = stripeSessionId.startsWith('cs_test_');
          const isLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') || 
                           (!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY_TEST?.startsWith('sk_live_'));
          
          if (isTestSession && isLiveKey) {
            throw new Error(
              `Test session cannot be retrieved with live Stripe key. ` +
              `Session ID: ${stripeSessionId}. ` +
              `Please use STRIPE_SECRET_KEY_TEST (sk_test_...) to retrieve test sessions.`
            );
          } else if (!isTestSession && !isLiveKey) {
            throw new Error(
              `Live session cannot be retrieved with test Stripe key. ` +
              `Session ID: ${stripeSessionId}. ` +
              `Please use STRIPE_SECRET_KEY (sk_live_...) to retrieve live sessions.`
            );
          } else {
            throw new Error(
              `Stripe checkout session not found: ${stripeSessionId}. ` +
              `The session may have been deleted or expired, or there's a mode mismatch.`
            );
          }
        }
        throw stripeError;
      }

      const fullDetails: any = {
        // Stored card data
        storedCard: {
          id: card.id,
          stripeSessionId: card.stripeSessionId,
          stripePaymentIntentId: card.stripePaymentIntentId,
          stripeCustomerId: card.stripeCustomerId,
          userEmail: card.userEmail,
          amount: card.amount,
          currency: card.currency,
          cardLast4: card.cardLast4,
          cardBrand: card.cardBrand,
          cardExpMonth: card.cardExpMonth,
          cardExpYear: card.cardExpYear,
          cardFunding: card.cardFunding,
          cardCountry: card.cardCountry,
          paymentStatus: card.paymentStatus,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
          paidAt: card.paidAt,
        },
        // Stripe session details
        session: {
          id: session.id,
          status: session.status,
          paymentStatus: session.payment_status,
          customerEmail: session.customer_email,
          customerDetails: session.customer_details
            ? {
                name: session.customer_details.name,
                email: session.customer_details.email,
                phone: session.customer_details.phone,
                address: session.customer_details.address
                  ? {
                      line1: session.customer_details.address.line1,
                      line2: session.customer_details.address.line2,
                      city: session.customer_details.address.city,
                      state: session.customer_details.address.state,
                      postalCode: session.customer_details.address.postal_code,
                      country: session.customer_details.address.country,
                    }
                  : null,
              }
            : null,
          shipping: (session as any).shipping
            ? {
                name: (session as any).shipping.name,
                phone: (session as any).shipping.phone,
                address: (session as any).shipping.address
                  ? {
                      line1: (session as any).shipping.address.line1,
                      line2: (session as any).shipping.address.line2,
                      city: (session as any).shipping.address.city,
                      state: (session as any).shipping.address.state,
                      postalCode: (session as any).shipping.address.postal_code,
                      country: (session as any).shipping.address.country,
                    }
                  : null,
              }
            : null,
        },
        // Payment intent details
        paymentIntent: null,
        // Payment method details (card info)
        paymentMethod: null,
        // Customer details
        customer: null,
      };

      // Get payment intent details
      if (session.payment_intent) {
        const paymentIntent =
          typeof session.payment_intent === 'string'
            ? await stripeClient.paymentIntents.retrieve(session.payment_intent, {
                expand: ['payment_method'],
              })
            : session.payment_intent;

        // Get charges for billing details
        let billingDetails = null;
        try {
          const charges = await stripeClient.charges.list({
            payment_intent: paymentIntent.id,
            limit: 1,
          });
          if (charges.data.length > 0 && charges.data[0].billing_details) {
            const charge = charges.data[0];
            billingDetails = {
              name: charge.billing_details.name || null,
              email: charge.billing_details.email || null,
              phone: charge.billing_details.phone || null,
              address: charge.billing_details.address
                ? {
                    line1: charge.billing_details.address.line1 || null,
                    line2: charge.billing_details.address.line2 || null,
                    city: charge.billing_details.address.city || null,
                    state: charge.billing_details.address.state || null,
                    postalCode: charge.billing_details.address.postal_code || null,
                    country: charge.billing_details.address.country || null,
                  }
                : null,
            };
          }
        } catch (chargeError) {
          // If we can't get charges, that's okay - we'll use payment method billing details instead
          console.warn('Could not retrieve charges for payment intent:', chargeError);
        }

        fullDetails.paymentIntent = {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          description: paymentIntent.description || null,
          receiptEmail: paymentIntent.receipt_email || null,
          billingDetails: billingDetails,
        };

        // Get payment method details
        if (paymentIntent.payment_method) {
          const paymentMethod =
            typeof paymentIntent.payment_method === 'string'
              ? await stripeClient.paymentMethods.retrieve(
                  paymentIntent.payment_method,
                )
              : paymentIntent.payment_method;

          fullDetails.paymentMethod = {
            id: paymentMethod.id,
            type: paymentMethod.type,
            card: paymentMethod.card
              ? {
                  brand: paymentMethod.card.brand,
                  last4: paymentMethod.card.last4,
                  expMonth: paymentMethod.card.exp_month,
                  expYear: paymentMethod.card.exp_year,
                  funding: paymentMethod.card.funding,
                  country: paymentMethod.card.country,
                  network: paymentMethod.card.networks?.preferred || null,
                  wallet: paymentMethod.card.wallet,
                }
              : null,
            billingDetails: paymentMethod.billing_details
              ? {
                  name: paymentMethod.billing_details.name,
                  email: paymentMethod.billing_details.email,
                  phone: paymentMethod.billing_details.phone,
                  address: paymentMethod.billing_details.address
                    ? {
                        line1: paymentMethod.billing_details.address.line1,
                        line2: paymentMethod.billing_details.address.line2,
                        city: paymentMethod.billing_details.address.city,
                        state: paymentMethod.billing_details.address.state,
                        postalCode: paymentMethod.billing_details.address.postal_code,
                        country: paymentMethod.billing_details.address.country,
                      }
                    : null,
                }
              : null,
          };
        }
      }

      // Get customer details if available
      if (session.customer) {
        const customer =
          typeof session.customer === 'string'
            ? await stripeClient.customers.retrieve(session.customer)
            : session.customer;

        if (customer && !('deleted' in customer && customer.deleted)) {
          // Type guard to ensure it's not a deleted customer
          const activeCustomer = customer as Stripe.Customer;
          fullDetails.customer = {
            id: activeCustomer.id,
            email: activeCustomer.email || null,
            name: activeCustomer.name || null,
            phone: activeCustomer.phone || null,
            address: activeCustomer.address
              ? {
                  line1: activeCustomer.address.line1 || null,
                  line2: activeCustomer.address.line2 || null,
                  city: activeCustomer.address.city || null,
                  state: activeCustomer.address.state || null,
                  postalCode: activeCustomer.address.postal_code || null,
                  country: activeCustomer.address.country || null,
                }
              : null,
            created: activeCustomer.created,
            metadata: activeCustomer.metadata || {},
          };
        }
      }

      return fullDetails;
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      // If it's already a formatted error message, re-throw it
      if (error.message && error.message.includes('cannot be retrieved')) {
        throw error;
      }
      console.error('Error fetching full card details from Stripe:', error);
      
      // Provide helpful error message
      let errorMessage = `Failed to fetch full card details: ${error.message || 'Unknown error'}`;
      if (error.code === 'resource_missing') {
        errorMessage = `Stripe session not found. This could be due to:\n` +
          `1. Test/Live mode mismatch (test sessions require test keys, live sessions require live keys)\n` +
          `2. Session expired or deleted\n` +
          `3. Wrong Stripe account\n` +
          `Original error: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }
}

