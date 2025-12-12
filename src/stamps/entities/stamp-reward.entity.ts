import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum RewardType {
  GEMS = 'gems',
  BACKFLIP = 'backflip',
  CHOICE_PRIORITY = 'choice_priority',
  REKALL_TOKEN_AIRDROP = 'rekall_token_airdrop',
}

@Entity('stamp_rewards')
export class StampReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: RewardType,
  })
  rewardType: RewardType;

  @Column({ type: 'integer' })
  amount: number;

  @CreateDateColumn()
  createdAt: Date;
}

