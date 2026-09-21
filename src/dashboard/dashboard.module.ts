import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Assignment } from '../assignments/entities/assignment.entity.js';
import { TaskStep } from '../tasks/entities/task-step.entity.js';
import { Task } from '../tasks/entities/task.entity.js';
import { User } from '../users/entities/user.entity.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Task, TaskStep, User])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
