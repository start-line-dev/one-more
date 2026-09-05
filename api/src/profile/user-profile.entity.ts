import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity.js';

@Entity({ name: 'user_profiles' })
export class UserProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => UserEntity, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<UserEntity>;

  @Column({ type: 'real', nullable: true })
  weightKg!: number | null;

  @Column({ type: 'real', nullable: true })
  heightCm!: number | null;

  @Column({ type: 'text', nullable: true })
  gender!: string | null;

  @Column({ type: 'integer', nullable: true })
  ageYears!: number | null;

  @Column({ type: 'text', nullable: true })
  trainingGoal!: string | null;

  @Column({ type: 'text', nullable: true })
  trainingExperience!: string | null;

  @Column({ type: 'text', nullable: true })
  sessionsPerWeek!: string | null;

  @Column({ type: 'text', nullable: true })
  firstName!: string | null;

  @Column({ type: 'text', nullable: true })
  lastName!: string | null;

  @Column({ type: 'text', nullable: true, unique: true })
  inviteCode!: string | null;

  @Column({ type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  username!: string | null;

  @Column({ type: 'boolean', default: true })
  searchableByName!: boolean;

  @Column({ type: 'boolean', default: true })
  discoverableByUsername!: boolean;

  @Column({ type: 'uuid', nullable: true })
  referredByUserId!: string | null;

  @Column({ type: 'text', nullable: true })
  afMediaSource!: string | null;

  @Column({ type: 'text', nullable: true })
  afCampaign!: string | null;

  @Column({ type: 'text', nullable: true })
  afAdset!: string | null;

  @Column({ type: 'text', nullable: true })
  afAdgroup!: string | null;

  @Column({ type: 'text', nullable: true })
  afKeywords!: string | null;

  @Column({ type: 'boolean', nullable: true })
  afIsRetargeting!: boolean | null;

  @Column({ type: 'text', nullable: true })
  afSub1!: string | null;

  @Column({ type: 'text', nullable: true })
  afDeepLinkValue!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  attributionRecordedAt!: Date | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
