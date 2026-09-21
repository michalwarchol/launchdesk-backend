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
import { Assignment } from './assignment.entity.js';

@Entity('assignment_assignees')
@Unique(['assignmentId', 'userId'])
export class AssignmentAssignee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  assignmentId!: string;

  @ManyToOne(() => Assignment, (assignment) => assignment.assignees, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assignmentId' })
  assignment!: Relation<Assignment>;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.assignmentMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
