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
import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination.dto.js';
import { MANAGER_ROLES, User } from '../users/entities/user.entity.js';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from './dto/assignment.dto.js';
import { AssignmentsService } from './assignments.service.js';

class AssignmentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['completed', 'overdue', 'inProgress', 'notStarted'])
  status?: 'completed' | 'overdue' | 'inProgress' | 'notStarted';

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}

@ApiTags('assignments')
@ApiBearerAuth()
@Roles(...MANAGER_ROLES)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  findAll(@CurrentUser() user: User, @Query() query: AssignmentQueryDto) {
    return this.assignmentsService.findAll(query, user.organizationId);
  }

  @Get('me')
  findMine(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return this.assignmentsService.findMine(
      user.id,
      query,
      user.organizationId,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.assignmentsService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles(...MANAGER_ROLES)
  create(@Body() dto: CreateAssignmentDto, @CurrentUser() user: User) {
    return this.assignmentsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(...MANAGER_ROLES)
  @HttpCode(204)
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.assignmentsService.remove(id, user.organizationId);
  }

  @Delete(':id/assignees/:userId')
  @Roles(...MANAGER_ROLES)
  @HttpCode(204)
  async removeAssignee(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.assignmentsService.removeAssignee(
      id,
      userId,
      user.organizationId,
    );
  }
}
