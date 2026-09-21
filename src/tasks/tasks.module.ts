import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentsModule } from '../documents/documents.module.js';
import { Document } from '../documents/entities/document.entity.js';
import { TaskStepAttachment } from './entities/task-step-attachment.entity.js';
import { TaskStep } from './entities/task-step.entity.js';
import { Task } from './entities/task.entity.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskStep, TaskStepAttachment, Document]),
    DocumentsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
