import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum GemTransactionType {
  EARN = 'earn',
  SPEND = 'spend',
}

@Entity('gem_transactions')
export class GemTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'integer' })
  change: number;

  @Column({
    type: 'enum',
    enum: GemTransactionType,
  })
  type: GemTransactionType;

  @Column({ nullable: true })
  reason?: string;

  @Column({ nullable: true })
  metadata?: string;

  @CreateDateColumn()
  createdAt: Date;
}

