import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { DatabaseSeederModule } from './database-seeder/database-seeder.module';
import { StripePaymentsModule } from './stripe-payments/stripe-payments.module';
import { StampsModule } from './stamps/stamps.module';
import { User } from './users/entities/user.entity';
import { Wallet } from './wallets/entities/wallet.entity';
import { GemTransaction } from './users/entities/gem-transaction.entity';
import { StripeCard } from './stripe-payments/entities/stripe-card.entity';
import { UserItem } from './users/entities/user-item.entity';
import { StampReward } from './stamps/entities/stamp-reward.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL) || 60,
        limit: parseInt(process.env.RATE_LIMIT_LIMIT) || 100,
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'user_management',
      entities: [User, Wallet, GemTransaction, StripeCard, UserItem, StampReward],
      migrations: ['dist/src/migrations/*.js'],
      migrationsRun: process.env.RUN_MIGRATIONS === 'true', // Set RUN_MIGRATIONS=true to auto-run migrations
      synchronize: false, // Disabled - use migrations instead
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    UsersModule,
    WalletsModule,
    DatabaseSeederModule,
    StripePaymentsModule,
    StampsModule,
  ],
})
export class AppModule {}
