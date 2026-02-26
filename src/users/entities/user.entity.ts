import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { UserItem } from './user-item.entity';

export enum UserRole {
  MANAGER = 'manager',
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: 0 })
  gem: number;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ default: 0 })
  stampsCollected: number;

  @Column({ nullable: true })
  lastStampClaimDate: Date;

  @Column({ nullable: true })
  firstStampClaimDate: Date;

  // Stabilizer Signal (Pixelstream time) - 1:1 ratio signal%:minutes
  @Column({ type: 'float', default: 0 })
  stabilitySignalRemainingMinutes: number;

  @Column({ type: 'float', default: 60 })
  stabilitySignalFullCapacityMinutes: number;

  @Column({ nullable: true })
  stabilitySignalPausedAt: Date;

  @Column({ nullable: true })
  stabilitySignalLastActivityAt: Date;

  @Column({ default: 0 })
  stabilitySignalS: number;

  @Column({ default: 0 })
  stabilitySignalM: number;

  @Column({ default: 0 })
  stabilitySignalL: number;

  @OneToMany(() => UserItem, (userItem) => userItem.user, { cascade: true })
  userItems: UserItem[];

  @OneToMany(() => Wallet, (wallet) => wallet.user, { cascade: true })
  wallets: Wallet[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
