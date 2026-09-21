import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AppException } from '../common/exceptions/app.exception.js';
import {
  buildPaginationMeta,
  PaginatedResponse,
  parseSort,
  PaginationQueryDto,
} from '../common/dto/pagination.dto.js';
import { Task } from '../tasks/entities/task.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto/assignment.dto.js';
import { AssignmentResponseDto } from './dto/assignment-response.dto.js';
import { AssignmentAssignee } from './entities/assignment-assignee.entity.js';
import { Assignment } from './entities/assignment.entity.js';
import {
  AssignmentStatus,
  deriveAssignmentStatus,
} from './utils/assignment-status.js';

const ASSIGNMENT_SORT_KEYS = ['dueDate', 'createdAt', 'progress'] as const;

interface AssignmentQuery extends PaginationQueryDto {
  status?: AssignmentStatus;
  taskId?: string;
  assigneeId?: string;
}

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(AssignmentAssignee)
    private readonly assignmentAssigneesRepository: Repository<AssignmentAssignee>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(query: AssignmentQuery): Promise<PaginatedResponse<AssignmentResponseDto>> {
    const sort = parseSort(query.sort, ASSIGNMENT_SORT_KEYS);
    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.task', 'task')
      .leftJoinAndSelect('assignment.assignees', 'assignmentAssignee')
      .leftJoinAndSelect('assignmentAssignee.user', 'user');

    if (query.taskId) {
      qb.andWhere('assignment.taskId = :taskId', { taskId: query.taskId });
    }

    if (query.assigneeId) {
      qb.andWhere('assignmentAssignee.userId = :assigneeId', {
        assigneeId: query.assigneeId,
      });
    }

    qb.orderBy(
      sort ? `assignment.${sort.key}` : 'assignment.createdAt',
      sort?.direction ?? 'DESC',
    );

    const [assignments] = await qb.getManyAndCount();
    const filtered = query.status
      ? assignments.filter(
          (assignment) =>
            deriveAssignmentStatus(Number(assignment.progress), assignment.dueDate) ===
            query.status,
        )
      : assignments;

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
      data: data.map((assignment) => this.toResponse(assignment)),
      meta: buildPaginationMeta(page, pageSize, filtered.length),
    };
  }

  async findMine(userId: string, query: PaginationQueryDto) {
    return this.findAll({ ...query, assigneeId: userId });
  }

  async findOne(id: string): Promise<AssignmentResponseDto> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
      relations: {
        task: true,
        assignees: {
          user: true,
        },
      },
    });

    if (!assignment) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    return this.toResponse(assignment);
  }

  async create(dto: CreateAssignmentDto, user: User): Promise<AssignmentResponseDto> {
    const task = await this.tasksRepository.findOne({ where: { id: dto.taskId } });

    if (!task) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    const assignees = await this.usersRepository.find({
      where: { id: In(dto.assigneeIds) },
    });

    if (assignees.length !== dto.assigneeIds.length) {
      throw new AppException('invalidAssignee', HttpStatus.BAD_REQUEST);
    }

    const assignment = await this.assignmentsRepository.save(
      this.assignmentsRepository.create({
        taskId: dto.taskId,
        dueDate: dto.dueDate,
        progress: '0',
        completedAt: null,
        createdById: user.id,
      }),
    );

    await this.assignmentAssigneesRepository.save(
      dto.assigneeIds.map((userId) =>
        this.assignmentAssigneesRepository.create({
          assignmentId: assignment.id,
          userId,
        }),
      ),
    );

    return this.findOne(assignment.id);
  }

  async update(
    id: string,
    dto: UpdateAssignmentDto,
    currentUser: User,
  ): Promise<AssignmentResponseDto> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
      relations: {
        assignees: true,
      },
    });

    if (!assignment) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    const isAssignee = assignment.assignees.some(
      (assignee) => assignee.userId === currentUser.id,
    );
    const isAdmin = currentUser.role === UserRole.Admin;

    if (!isAdmin && !isAssignee) {
      throw new AppException('forbidden', HttpStatus.FORBIDDEN);
    }

    if (dto.progress !== undefined) {
      if (!isAssignee && !isAdmin) {
        throw new AppException('forbidden', HttpStatus.FORBIDDEN);
      }

      assignment.progress = dto.progress.toFixed(2);
      assignment.completedAt = dto.progress >= 1 ? new Date().toISOString().slice(0, 10) : null;
    }

    if (isAdmin) {
      if (dto.dueDate !== undefined) {
        assignment.dueDate = dto.dueDate;
      }

      if (dto.assigneeIds !== undefined) {
        await this.assignmentAssigneesRepository.delete({ assignmentId: id });
        await this.assignmentAssigneesRepository.save(
          dto.assigneeIds.map((userId) =>
            this.assignmentAssigneesRepository.create({
              assignmentId: id,
              userId,
            }),
          ),
        );
      }
    }

    await this.assignmentsRepository.save(assignment);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const assignment = await this.assignmentsRepository.findOne({ where: { id } });

    if (!assignment) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    await this.assignmentsRepository.remove(assignment);
  }

  toResponse(assignment: Assignment): AssignmentResponseDto {
    return {
      id: assignment.id,
      taskId: assignment.taskId,
      taskName: assignment.task?.name ?? '',
      assignees: (assignment.assignees ?? []).map((assignee) => ({
        id: assignee.user.id,
        firstName: assignee.user.firstName,
        lastName: assignee.user.lastName,
        avatar: assignee.user.avatarUrl ?? undefined,
      })),
      progress: Number(assignment.progress),
      dueDate: assignment.dueDate,
      createdAt: assignment.createdAt.toISOString().slice(0, 10),
      completedAt: assignment.completedAt,
    };
  }
}
