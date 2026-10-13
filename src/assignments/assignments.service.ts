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
import { StorageService } from '../storage/storage.service.js';
import { Task } from '../tasks/entities/task.entity.js';
import { MANAGER_ROLES, User } from '../users/entities/user.entity.js';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from './dto/assignment.dto.js';
import { AssignmentResponseDto } from './dto/assignment-response.dto.js';
import { MyAssignmentResponseDto } from './dto/my-assignment-response.dto.js';
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
    private readonly storageService: StorageService,
  ) {}

  async findAll(
    query: AssignmentQuery,
    organizationId: string,
  ): Promise<PaginatedResponse<AssignmentResponseDto>> {
    const sort = parseSort(query.sort, ASSIGNMENT_SORT_KEYS);
    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.task', 'task')
      .leftJoinAndSelect('assignment.assignees', 'assignmentAssignee')
      .leftJoinAndSelect('assignmentAssignee.user', 'user')
      .where('assignment.organizationId = :organizationId', { organizationId });

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
            deriveAssignmentStatus(
              Number(assignment.progress),
              assignment.dueDate,
            ) === query.status,
        )
      : assignments;

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
      data: await Promise.all(
        data.map((assignment) => this.toResponse(assignment)),
      ),
      meta: buildPaginationMeta(page, pageSize, filtered.length),
    };
  }

  async findMine(
    userId: string,
    query: PaginationQueryDto,
    organizationId: string,
  ): Promise<PaginatedResponse<MyAssignmentResponseDto>> {
    const sort = parseSort(query.sort, ASSIGNMENT_SORT_KEYS);
    const page = query.page;
    const pageSize = query.pageSize;

    const [assignments, total] = await this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.task', 'task')
      .innerJoin(
        'assignment.assignees',
        'assignmentAssignee',
        'assignmentAssignee.userId = :userId',
        { userId },
      )
      .where('assignment.organizationId = :organizationId', { organizationId })
      .orderBy(
        sort ? `assignment.${sort.key}` : 'assignment.dueDate',
        sort?.direction ?? 'ASC',
      )
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: assignments.map((assignment) => this.toMyResponse(assignment)),
      meta: buildPaginationMeta(page, pageSize, total),
    };
  }

  async findOne(
    id: string,
    organizationId: string,
  ): Promise<AssignmentResponseDto> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id, organizationId },
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

  async create(
    dto: CreateAssignmentDto,
    user: User,
  ): Promise<AssignmentResponseDto> {
    const task = await this.tasksRepository.findOne({
      where: { id: dto.taskId, organizationId: user.organizationId },
    });

    if (!task) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    const assignees = await this.usersRepository.find({
      where: { id: In(dto.assigneeIds), organizationId: user.organizationId },
    });

    if (assignees.length !== dto.assigneeIds.length) {
      throw new AppException('invalidAssignee', HttpStatus.BAD_REQUEST);
    }

    const assignment = await this.assignmentsRepository.save(
      this.assignmentsRepository.create({
        taskId: dto.taskId,
        organizationId: user.organizationId,
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

    return this.findOne(assignment.id, user.organizationId);
  }

  async update(
    id: string,
    dto: UpdateAssignmentDto,
    currentUser: User,
  ): Promise<AssignmentResponseDto> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id, organizationId: currentUser.organizationId },
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
    const isManager = MANAGER_ROLES.includes(currentUser.role);

    if (!isManager && !isAssignee) {
      throw new AppException('forbidden', HttpStatus.FORBIDDEN);
    }

    const columns: {
      progress?: string;
      completedAt?: string | null;
      dueDate?: string;
    } = {};

    if (dto.progress !== undefined) {
      if (!isAssignee && !isManager) {
        throw new AppException('forbidden', HttpStatus.FORBIDDEN);
      }

      columns.progress = dto.progress.toFixed(2);
      columns.completedAt =
        dto.progress >= 1 ? new Date().toISOString().slice(0, 10) : null;
    }

    if (isManager) {
      if (dto.dueDate !== undefined) {
        columns.dueDate = dto.dueDate;
      }

      if (dto.assigneeIds !== undefined) {
        const assignees = await this.usersRepository.find({
          where: {
            id: In(dto.assigneeIds),
            organizationId: currentUser.organizationId,
          },
        });

        if (assignees.length !== dto.assigneeIds.length) {
          throw new AppException('invalidAssignee', HttpStatus.BAD_REQUEST);
        }

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

    // Update columns directly. Saving the loaded assignment would persist its
    // stale assignees relation and delete the rows just inserted above.
    if (Object.keys(columns).length > 0) {
      await this.assignmentsRepository.update(id, columns);
    }

    return this.findOne(id, currentUser.organizationId);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id, organizationId },
    });

    if (!assignment) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    await this.assignmentsRepository.remove(assignment);
  }

  async removeAssignee(
    assignmentId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id: assignmentId, organizationId },
    });

    if (!assignment) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    const result = await this.assignmentAssigneesRepository.delete({
      assignmentId,
      userId,
    });

    if (!result.affected) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }
  }

  toMyResponse(assignment: Assignment): MyAssignmentResponseDto {
    return {
      id: assignment.id,
      name: assignment.task.name,
      description: assignment.task.description,
      dueDate: assignment.dueDate,
    };
  }

  async toResponse(assignment: Assignment): Promise<AssignmentResponseDto> {
    return {
      id: assignment.id,
      taskId: assignment.taskId,
      taskName: assignment.task?.name ?? '',
      assignees: await Promise.all(
        (assignment.assignees ?? []).map(async (assignee) => ({
          id: assignee.user.id,
          firstName: assignee.user.firstName,
          lastName: assignee.user.lastName,
          avatar: await this.storageService.resolveDownloadUrl(
            assignee.user.avatarUrl,
          ),
        })),
      ),
      progress: Number(assignment.progress),
      dueDate: assignment.dueDate,
      createdAt: assignment.createdAt.toISOString().slice(0, 10),
      completedAt: assignment.completedAt,
    };
  }
}
