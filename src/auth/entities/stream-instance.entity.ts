import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stream_instances')
export class StreamInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unique: true })
  socketPort: number;

  @Column({ unique: true })
  pixelStreamUrl: string;

  @Column({ type: 'uuid', nullable: true, unique: true })
  userId: string | null;

  @Column({ nullable: true })
  userEmail: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
