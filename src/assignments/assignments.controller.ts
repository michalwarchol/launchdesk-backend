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
  Redirect,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination.dto.js';
import {
  MANAGER_ROLES,
  User,
  UserRole,
} from '../users/entities/user.entity.js';
import {
  CreateAssignmentDto,
  SetStepCompletionDto,
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
  @Roles(...MANAGER_ROLES, UserRole.User)
  findMine(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return this.assignmentsService.findMine(
      user.id,
      query,
      user.organizationId,
    );
  }

  @Get('me/:id')
  @Roles(...MANAGER_ROLES, UserRole.User)
  findMyTask(@CurrentUser() user: User, @Param('id') id: string) {
    return this.assignmentsService.findMyTask(id, user);
  }

  @Patch('me/:id/steps/:stepId')
  @Roles(...MANAGER_ROLES, UserRole.User)
  setStepCompletion(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: SetStepCompletionDto,
  ) {
    return this.assignmentsService.setStepCompletion(
      id,
      stepId,
      dto.completed,
      dto.notes,
      user,
    );
  }

  @Get('me/:id/steps/:stepId/attachments/:documentId/download')
  @Roles(...MANAGER_ROLES, UserRole.User)
  @Redirect()
  async downloadStepAttachment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Param('documentId') documentId: string,
  ) {
    const url = await this.assignmentsService.getStepAttachmentDownloadUrl(
      id,
      stepId,
      documentId,
      user,
    );

    return { url, statusCode: 302 };
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
