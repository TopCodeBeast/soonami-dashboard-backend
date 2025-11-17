import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { GemTransaction } from './entities/gem-transaction.entity';
import { GemTransactionsService } from './gem-transactions.service';
import { Wallet } from '../wallets/entities/wallet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, GemTransaction, Wallet])],
  controllers: [UsersController],
  providers: [UsersService, GemTransactionsService],
  exports: [UsersService, GemTransactionsService],
})
export class UsersModule {}
