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
  UpdateTaskStepDto,
} from './dto/task.dto.js';
import { TasksService } from './tasks.service.js';

@ApiTags('tasks')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return this.tasksService.findAll(query, user.organizationId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tasksService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles(UserRole.Admin)
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: User) {
    return this.tasksService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  @HttpCode(204)
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.tasksService.remove(id, user.organizationId);
  }

  @Post(':id/steps')
  @Roles(UserRole.Admin)
  addStep(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateTaskStepDto,
  ) {
    return this.tasksService.addStep(id, dto, user.organizationId);
  }

  @Patch(':id/steps/reorder')
  @Roles(UserRole.Admin)
  reorderSteps(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReorderStepsDto,
  ) {
    return this.tasksService.reorderSteps(id, dto, user.organizationId);
  }

  @Patch(':id/steps/:stepId')
  @Roles(UserRole.Admin)
  updateStep(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateTaskStepDto,
  ) {
    return this.tasksService.updateStep(id, stepId, dto, user.organizationId);
  }

  @Delete(':id/steps/:stepId')
  @Roles(UserRole.Admin)
  @HttpCode(204)
  async removeStep(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
  ) {
    await this.tasksService.removeStep(id, stepId, user.organizationId);
  }
}
