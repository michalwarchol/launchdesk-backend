import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination.dto.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import {
  CreateTaskDto,
  CreateTaskStepDto,
  ReorderStepsDto,
  UpdateTaskDto,
  UpdateTaskStepDto,
} from './dto/task.dto.js';
import { TasksService } from './tasks.service.js';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.tasksService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @Roles(UserRole.Admin)
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: User) {
    return this.tasksService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.tasksService.remove(id);
  }

  @Post(':id/steps')
  @Roles(UserRole.Admin)
  addStep(@Param('id') id: string, @Body() dto: CreateTaskStepDto) {
    return this.tasksService.addStep(id, dto);
  }

  @Patch(':id/steps/reorder')
  @Roles(UserRole.Admin)
  reorderSteps(@Param('id') id: string, @Body() dto: ReorderStepsDto) {
    return this.tasksService.reorderSteps(id, dto);
  }

  @Patch(':id/steps/:stepId')
  @Roles(UserRole.Admin)
  updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateTaskStepDto,
  ) {
    return this.tasksService.updateStep(id, stepId, dto);
  }

  @Delete(':id/steps/:stepId')
  @Roles(UserRole.Admin)
  @HttpCode(204)
  async removeStep(@Param('id') id: string, @Param('stepId') stepId: string) {
    await this.tasksService.removeStep(id, stepId);
  }
}
