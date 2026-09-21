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

import { Document } from '../../documents/entities/document.entity.js';
import { TaskStep } from './task-step.entity.js';

@Entity('task_step_attachments')
@Unique(['taskStepId', 'documentId'])
export class TaskStepAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  taskStepId!: string;

  @ManyToOne(() => TaskStep, (step) => step.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskStepId' })
  taskStep!: Relation<TaskStep>;

  @Column({ type: 'uuid' })
  documentId!: string;

  @ManyToOne(() => Document, (document) => document.taskStepAttachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document!: Relation<Document>;

  @Column({ type: 'int' })
  position!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
