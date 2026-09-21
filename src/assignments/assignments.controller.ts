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
import { User, UserRole } from '../users/entities/user.entity.js';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto/assignment.dto.js';
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
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  findAll(@Query() query: AssignmentQueryDto) {
    return this.assignmentsService.findAll(query);
  }

  @Get('me')
  findMine(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return this.assignmentsService.findMine(user.id, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.Admin)
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
  @Roles(UserRole.Admin)
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.assignmentsService.remove(id);
  }
}
