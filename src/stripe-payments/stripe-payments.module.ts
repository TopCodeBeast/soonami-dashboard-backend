import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeCardsController } from './stripe-cards.controller';
import { StripeCardsService } from './stripe-cards.service';
import { StripeCard } from './entities/stripe-card.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StripeCard, User])],
  controllers: [StripeCardsController],
  providers: [StripeCardsService],
  exports: [StripeCardsService],
})
export class StripePaymentsModule {}

