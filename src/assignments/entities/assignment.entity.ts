import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Task } from '../../tasks/entities/task.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { AssignmentAssignee } from './assignment-assignee.entity.js';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => Task, (task) => task.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Relation<Task>;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  progress!: string;

  @Column({ type: 'date' })
  dueDate!: string;

  @Column({ type: 'date', nullable: true })
  completedAt!: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => User, (user) => user.createdAssignments, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: Relation<User>;

  @OneToMany(() => AssignmentAssignee, (assignee) => assignee.assignment)
  assignees!: Relation<AssignmentAssignee[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
