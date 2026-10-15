import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StorageModule } from '../storage/storage.module.js';
import { TaskStep } from '../tasks/entities/task-step.entity.js';
import { Task } from '../tasks/entities/task.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AssignmentsController } from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';
import { AssignmentAssignee } from './entities/assignment-assignee.entity.js';
import { AssignmentStepCompletion } from './entities/assignment-step-completion.entity.js';
import { AssignmentStepNote } from './entities/assignment-step-note.entity.js';
import { Assignment } from './entities/assignment.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      AssignmentAssignee,
      AssignmentStepCompletion,
      AssignmentStepNote,
      Task,
      TaskStep,
      User,
    ]),
    StorageModule,
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
