import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { AssignmentAssignee } from '../../assignments/entities/assignment-assignee.entity.js';
import { Assignment } from '../../assignments/entities/assignment.entity.js';
import { InviteToken } from '../../auth/entities/invite-token.entity.js';
import { OAuthAccount } from '../../auth/entities/oauth-account.entity.js';
import { PasswordResetToken } from '../../auth/entities/password-reset-token.entity.js';
import { RefreshToken } from '../../auth/entities/refresh-token.entity.js';
import { Document } from '../../documents/entities/document.entity.js';
import { Organization } from '../../organizations/entities/organization.entity.js';
import { Task } from '../../tasks/entities/task.entity.js';

export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

export enum UserStatus {
  Active = 'active',
  Invited = 'invited',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.User })
  role!: UserRole;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.Invited })
  status!: UserStatus;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => Organization, (organization) => organization.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization!: Relation<Organization>;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: Relation<RefreshToken[]>;

  @OneToMany(() => InviteToken, (token) => token.user)
  inviteTokens!: Relation<InviteToken[]>;

  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens!: Relation<PasswordResetToken[]>;

  @OneToMany(() => OAuthAccount, (account) => account.user)
  oauthAccounts!: Relation<OAuthAccount[]>;

  @OneToMany(() => Task, (task) => task.createdBy)
  createdTasks!: Relation<Task[]>;

  @OneToMany(() => Assignment, (assignment) => assignment.createdBy)
  createdAssignments!: Relation<Assignment[]>;

  @OneToMany(() => AssignmentAssignee, (assignee) => assignee.user)
  assignmentMemberships!: Relation<AssignmentAssignee[]>;

  @OneToMany(() => Document, (document) => document.uploadedBy)
  uploadedDocuments!: Relation<Document[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
