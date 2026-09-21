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

import { Task } from './task.entity.js';
import { TaskStepAttachment } from './task-step-attachment.entity.js';

@Entity('task_steps')
export class TaskStep {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => Task, (task) => task.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Relation<Task>;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'int' })
  position!: number;

  @OneToMany(() => TaskStepAttachment, (attachment) => attachment.taskStep)
  attachments!: Relation<TaskStepAttachment[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
