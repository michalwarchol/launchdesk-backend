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

import { Assignment } from '../../assignments/entities/assignment.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { TaskStep } from './task-step.entity.js';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => User, (user) => user.createdTasks, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: Relation<User>;

  @OneToMany(() => TaskStep, (step) => step.task)
  steps!: Relation<TaskStep[]>;

  @OneToMany(() => Assignment, (assignment) => assignment.task)
  assignments!: Relation<Assignment[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
