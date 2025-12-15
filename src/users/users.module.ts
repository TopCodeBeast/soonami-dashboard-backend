import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { GemTransaction } from './entities/gem-transaction.entity';
import { GemTransactionsService } from './gem-transactions.service';
import { UserItem } from './entities/user-item.entity';
import { UserItemsService } from './user-items.service';
import { Wallet } from '../wallets/entities/wallet.entity';
import { StampReward } from '../stamps/entities/stamp-reward.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, GemTransaction, Wallet, UserItem, StampReward])],
  controllers: [UsersController],
  providers: [UsersService, GemTransactionsService, UserItemsService],
  exports: [UsersService, GemTransactionsService, UserItemsService],
})
export class UsersModule {}
