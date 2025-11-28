import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { DatabaseSeederModule } from './database-seeder/database-seeder.module';
import { User } from './users/entities/user.entity';
import { Wallet } from './wallets/entities/wallet.entity';
import { GemTransaction } from './users/entities/gem-transaction.entity';

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
      entities: [User, Wallet, GemTransaction],
      migrations: ['dist/src/migrations/*.js'],
      migrationsRun: process.env.RUN_MIGRATIONS === 'true', // Set RUN_MIGRATIONS=true to auto-run migrations
      synchronize: false, // Disabled - use migrations instead
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    UsersModule,
    WalletsModule,
    DatabaseSeederModule,
  ],
})
export class AppModule {}
