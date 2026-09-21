import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from '../tasks/entities/task.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AssignmentsController } from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';
import { AssignmentAssignee } from './entities/assignment-assignee.entity.js';
import { Assignment } from './entities/assignment.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, AssignmentAssignee, Task, User]),
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
