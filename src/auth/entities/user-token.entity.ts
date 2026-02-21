import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_tokens')
@Index(['username'])
@Index(['userId'])
@Index(['token'])
export class UserToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId' })
  userId: string; // User ID (UUID)

  @Column({ name: 'username' })
  username: string; // email/username of the user

  @Column({ unique: true })
  token: string; // JWT token string

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp' })
  lastActivityAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date; // Absolute expiration (1 hour from creation)

  @Column({ default: true })
  isActive: boolean; // Set to false when expired or logged out

  @Column({ name: 'frontendService', nullable: true })
  frontendService: string; // Which frontend/service is using this token (e.g., 'python-ai-frontend', 'soonami-dashboard-frontend')
}
