import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from './src/users/entities/user.entity';
import { Wallet } from './src/wallets/entities/wallet.entity';
import { GemTransaction } from './src/users/entities/gem-transaction.entity';
import { StripeCard } from './src/stripe-payments/entities/stripe-card.entity';
import { UserItem } from './src/users/entities/user-item.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'user_management',
  entities: [User, Wallet, GemTransaction, StripeCard, UserItem],
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // Never use synchronize with migrations
  logging: process.env.NODE_ENV === 'development',
});

