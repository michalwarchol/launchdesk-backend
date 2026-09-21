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

import { TaskStepAttachment } from '../../tasks/entities/task-step-attachment.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum DocumentType {
  Image = 'image',
  Spreadsheet = 'spreadsheet',
  Text = 'text',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: DocumentType })
  type!: DocumentType;

  @Column({ type: 'varchar', length: 20 })
  extension!: string;

  @Column({ type: 'bigint' })
  size!: string;

  @Column({ type: 'varchar', length: 255 })
  mimeType!: string;

  @Column({ type: 'varchar', length: 500 })
  s3Key!: string;

  @Column({ type: 'uuid', nullable: true })
  uploadedById!: string | null;

  @ManyToOne(() => User, (user) => user.uploadedDocuments, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy!: Relation<User>;

  @OneToMany(() => TaskStepAttachment, (attachment) => attachment.document)
  taskStepAttachments!: Relation<TaskStepAttachment[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
