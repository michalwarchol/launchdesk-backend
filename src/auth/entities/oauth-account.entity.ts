import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { User } from '../../users/entities/user.entity.js';

export enum OAuthProvider {
  Google = 'google',
  Github = 'github',
}

@Entity('oauth_accounts')
@Unique(['provider', 'providerAccountId'])
export class OAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.oauthAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User>;

  @Column({ type: 'enum', enum: OAuthProvider })
  provider!: OAuthProvider;

  @Column({ type: 'varchar', length: 255 })
  providerAccountId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
