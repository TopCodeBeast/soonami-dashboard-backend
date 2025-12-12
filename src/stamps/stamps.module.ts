import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StampsController } from './stamps.controller';
import { StampsService } from './stamps.service';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/user.entity';
import { StampReward } from './entities/stamp-reward.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, StampReward]),
    UsersModule,
  ],
  controllers: [StampsController],
  providers: [StampsService],
  exports: [StampsService],
})
export class StampsModule {}

