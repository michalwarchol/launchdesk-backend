import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { TaskStep } from '../../tasks/entities/task-step.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Assignment } from './assignment.entity.js';

@Entity('assignment_step_notes')
@Unique(['assignmentId', 'userId', 'taskStepId'])
export class AssignmentStepNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  assignmentId!: string;

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignmentId' })
  assignment!: Relation<Assignment>;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User>;

  @Column({ type: 'uuid' })
  taskStepId!: string;

  @ManyToOne(() => TaskStep, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskStepId' })
  taskStep!: Relation<TaskStep>;

  @Column({ type: 'text' })
  notes!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
