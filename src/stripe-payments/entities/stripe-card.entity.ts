import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('stripe_cards')
@Index(['stripeSessionId'], { unique: true })
@Index(['userEmail'])
@Index(['stripeCustomerId'])
@Index(['createdAt'])
export class StripeCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Stripe identifiers
  @Column({ unique: true })
  stripeSessionId: string;

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  stripeCustomerId: string;

  // User information
  @Column()
  userEmail: string;

  @Column('uuid', { nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Payment details
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  // Card details (PCI compliant - only last 4 digits, brand, expiry)
  @Column({ nullable: true })
  cardLast4: string;

  @Column({ nullable: true })
  cardBrand: string; // visa, mastercard, amex, discover, etc.

  @Column({ nullable: true })
  cardExpMonth: number;

  @Column({ nullable: true })
  cardExpYear: number;

  @Column({ nullable: true })
  cardFunding: string; // credit, debit, prepaid, unknown

  @Column({ nullable: true })
  cardCountry: string; // Two-letter ISO code

  // Additional metadata
  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('jsonb', { nullable: true })
  stripeMetadata: Record<string, any>;

  // Payment status
  @Column({ default: 'pending' })
  paymentStatus: string; // pending, paid, failed, canceled, refunded

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  paidAt: Date;
}

