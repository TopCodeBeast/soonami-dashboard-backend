import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum UserItemType {
  BACKFLIP = 'backflip',
  CHOICE_PRIORITY = 'choicePriority',
  REKALL_TOKEN_AIRDROP = 'rekallTokenAirdrop',
}

@Entity('user_items')
export class UserItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.userItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: UserItemType })
  itemType: UserItemType;

  @Column({ type: 'int', default: 0 })
  amount: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

