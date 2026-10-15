import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';

import { AppException } from '../common/exceptions/app.exception.js';
import { isRichTextBlank } from '../common/utils/rich-text.js';
import {
  buildPaginationMeta,
  PaginatedResponse,
  parseSort,
  PaginationQueryDto,
} from '../common/dto/pagination.dto.js';
import { StorageService } from '../storage/storage.service.js';
import { TaskStep } from '../tasks/entities/task-step.entity.js';
import { Task } from '../tasks/entities/task.entity.js';
import { MANAGER_ROLES, User } from '../users/entities/user.entity.js';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from './dto/assignment.dto.js';
import { AssignmentResponseDto } from './dto/assignment-response.dto.js';
import { MyAssignmentResponseDto } from './dto/my-assignment-response.dto.js';
import { MyTaskDetailDto } from './dto/my-task-detail.dto.js';
import { AssignmentAssignee } from './entities/assignment-assignee.entity.js';
import { AssignmentStepCompletion } from './entities/assignment-step-completion.entity.js';
import { AssignmentStepNote } from './entities/assignment-step-note.entity.js';
import { Assignment } from './entities/assignment.entity.js';
import {
  AssignmentStatus,
  deriveAssignmentStatus,
} from './utils/assignment-status.js';
import {
  DerivedAssignmentProgress,
  deriveAssignmentProgress,
} from './utils/assignment-progress.js';

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
    @InjectRepository(AssignmentStepCompletion)
    private readonly completionsRepository: Repository<AssignmentStepCompletion>,
    @InjectRepository(AssignmentStepNote)
    private readonly notesRepository: Repository<AssignmentStepNote>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskStep)
    private readonly taskStepsRepository: Repository<TaskStep>,
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

    const sortByProgress = sort?.key === 'progress';

    if (!sortByProgress) {
      qb.orderBy(
        sort ? `assignment.${sort.key}` : 'assignment.createdAt',
        sort?.direction ?? 'DESC',
      );
    }

    const assignments = await qb.getMany();
    const derived = await this.progressByAssignment(assignments);
    const filtered = query.status
      ? assignments.filter(
          (assignment) =>
            deriveAssignmentStatus(
              derived.get(assignment.id)?.progress ?? 0,
              assignment.dueDate,
            ) === query.status,
        )
      : [...assignments];

    if (sortByProgress && sort) {
      const direction = sort.direction === 'ASC' ? 1 : -1;
      filtered.sort(
        (left, right) =>
          ((derived.get(left.id)?.progress ?? 0) -
            (derived.get(right.id)?.progress ?? 0)) *
          direction,
      );
    }

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
      data: await Promise.all(
        data.map((assignment) =>
          this.toResponse(
            assignment,
            derived.get(assignment.id) ?? emptyProgress(),
          ),
        ),
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
    const sortByProgress = sort?.key === 'progress';

    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.task', 'task')
      .innerJoin(
        'assignment.assignees',
        'assignmentAssignee',
        'assignmentAssignee.userId = :userId',
        { userId },
      )
      .where('assignment.organizationId = :organizationId', { organizationId });

    if (!sortByProgress) {
      qb.orderBy(
        sort ? `assignment.${sort.key}` : 'assignment.dueDate',
        sort?.direction ?? 'ASC',
      );
    }

    if (!sortByProgress) {
      const page = query.page;
      const pageSize = query.pageSize;
      const [assignments, total] = await qb
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();

      return {
        data: assignments.map((assignment) => this.toMyResponse(assignment)),
        meta: buildPaginationMeta(page, pageSize, total),
      };
    }

    const assignments = await qb.getMany();
    const derived = await this.progressByAssignment(assignments);
    const direction = sort?.direction === 'DESC' ? -1 : 1;
    assignments.sort(
      (left, right) =>
        ((derived.get(left.id)?.byAssignee.get(userId) ?? 0) -
          (derived.get(right.id)?.byAssignee.get(userId) ?? 0)) *
        direction,
    );

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;

    return {
      data: assignments
        .slice(start, start + pageSize)
        .map((assignment) => this.toMyResponse(assignment)),
      meta: buildPaginationMeta(page, pageSize, assignments.length),
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

    const derived = await this.progressByAssignment([assignment]);

    return this.toResponse(assignment, derived.get(assignment.id) ?? emptyProgress());
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
      dueDate?: string;
    } = {};

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
        await this.deleteCompletionsExcept(id, dto.assigneeIds);
        await this.refreshCompletedAt(id);
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

    await this.completionsRepository.delete({ assignmentId, userId });
    await this.refreshCompletedAt(assignmentId);
  }

  toMyResponse(assignment: Assignment): MyAssignmentResponseDto {
    return {
      id: assignment.id,
      name: assignment.task.name,
      description: assignment.task.description,
      dueDate: assignment.dueDate,
    };
  }

  async toResponse(
    assignment: Assignment,
    derived: DerivedAssignmentProgress,
  ): Promise<AssignmentResponseDto> {
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
          progress: derived.byAssignee.get(assignee.userId) ?? 0,
        })),
      ),
      progress: derived.progress,
      dueDate: assignment.dueDate,
      createdAt: assignment.createdAt.toISOString().slice(0, 10),
      completedAt: assignment.completedAt,
    };
  }

  async progressByAssignment(
    assignments: Assignment[],
  ): Promise<Map<string, DerivedAssignmentProgress>> {
    const derived = new Map<string, DerivedAssignmentProgress>();

    if (assignments.length === 0) return derived;

    const assignmentIds = assignments.map((assignment) => assignment.id);
    const taskIds = [...new Set(assignments.map((assignment) => assignment.taskId))];
    const [steps, completions, assignees] = await Promise.all([
      this.taskStepsRepository.find({ where: { taskId: In(taskIds) } }),
      this.completionsRepository.find({
        where: { assignmentId: In(assignmentIds) },
      }),
      this.assignmentAssigneesRepository.find({
        where: { assignmentId: In(assignmentIds) },
      }),
    ]);

    const stepsByTask = new Map<string, string[]>();

    for (const step of steps) {
      const ids = stepsByTask.get(step.taskId) ?? [];
      ids.push(step.id);
      stepsByTask.set(step.taskId, ids);
    }

    const assigneesByAssignment = new Map<string, string[]>();

    for (const assignee of assignees) {
      const ids = assigneesByAssignment.get(assignee.assignmentId) ?? [];
      ids.push(assignee.userId);
      assigneesByAssignment.set(assignee.assignmentId, ids);
    }

    const completionsByAssignment = new Map<
      string,
      { userId: string; taskStepId: string }[]
    >();

    for (const completion of completions) {
      const rows = completionsByAssignment.get(completion.assignmentId) ?? [];
      rows.push({
        userId: completion.userId,
        taskStepId: completion.taskStepId,
      });
      completionsByAssignment.set(completion.assignmentId, rows);
    }

    for (const assignment of assignments) {
      derived.set(
        assignment.id,
        deriveAssignmentProgress({
          assigneeIds: assigneesByAssignment.get(assignment.id) ?? [],
          stepIds: stepsByTask.get(assignment.taskId) ?? [],
          completions: completionsByAssignment.get(assignment.id) ?? [],
        }),
      );
    }

    return derived;
  }

  async refreshCompletedAtForTask(taskId: string): Promise<void> {
    const assignments = await this.assignmentsRepository.find({
      where: { taskId },
      select: { id: true },
    });

    for (const assignment of assignments) {
      await this.refreshCompletedAt(assignment.id);
    }
  }

  async findMyTask(
    assignmentId: string,
    user: User,
  ): Promise<MyTaskDetailDto> {
    const assignment = await this.loadMyTask(assignmentId, user);
    const completedStepIds = await this.completedStepIds(assignment.id, user.id);
    const notesByStep = await this.notesByStep(assignment.id, user.id);
    const steps = [...(assignment.task.steps ?? [])].sort(
      (left, right) => left.position - right.position,
    );
    const progress = steps.length === 0 ? 0 : completedStepIds.size / steps.length;

    return {
      id: assignment.id,
      name: assignment.task.name,
      description: assignment.task.description,
      dueDate: assignment.dueDate,
      progress,
      steps: steps.map((step) => ({
        id: step.id,
        name: step.name,
        description: step.description,
        completed: completedStepIds.has(step.id),
        notesRequired: step.notesRequired,
        notes: notesByStep.get(step.id) ?? '',
        attachments: [...(step.attachments ?? [])]
          .sort((left, right) => left.position - right.position)
          .map((attachment) => ({
            id: attachment.document.id,
            name: attachment.document.name,
            type: attachment.document.type,
            extension: attachment.document.extension,
            size: Number(attachment.document.size),
          })),
      })),
    };
  }

  async setStepCompletion(
    assignmentId: string,
    stepId: string,
    completed: boolean,
    notes: string | undefined,
    user: User,
  ): Promise<MyTaskDetailDto> {
    const assignment = await this.loadMyTask(assignmentId, user);
    const step = assignment.task.steps.find((item) => item.id === stepId);

    if (!step) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    const savedNote = await this.notesRepository.findOne({
      where: { assignmentId, userId: user.id, taskStepId: stepId },
    });
    const nextNotes = notes ?? savedNote?.notes ?? '';

    if (completed && step.notesRequired && isRichTextBlank(nextNotes)) {
      throw new AppException('notesRequired', HttpStatus.BAD_REQUEST);
    }

    if (notes !== undefined) {
      await this.saveNote(assignmentId, user.id, stepId, notes);
    }

    if (completed) {
      const existing = await this.completionsRepository.findOne({
        where: { assignmentId, userId: user.id, taskStepId: stepId },
      });

      if (!existing) {
        await this.completionsRepository.save(
          this.completionsRepository.create({
            assignmentId,
            userId: user.id,
            taskStepId: stepId,
          }),
        );
      }
    } else {
      await this.completionsRepository.delete({
        assignmentId,
        userId: user.id,
        taskStepId: stepId,
      });
    }

    await this.refreshCompletedAt(assignmentId);

    return this.findMyTask(assignmentId, user);
  }

  async getStepAttachmentDownloadUrl(
    assignmentId: string,
    stepId: string,
    documentId: string,
    user: User,
  ): Promise<string> {
    const assignment = await this.loadMyTask(assignmentId, user);
    const step = assignment.task.steps.find((item) => item.id === stepId);
    const attachment = step?.attachments?.find(
      (item) => item.documentId === documentId,
    );

    if (!attachment?.document) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    if (!(await this.storageService.objectExists(attachment.document.s3Key))) {
      throw new AppException('fileMissing', HttpStatus.NOT_FOUND);
    }

    return this.storageService.getPresignedDownloadUrl(
      attachment.document.s3Key,
      attachment.document.name,
    );
  }

  private async loadMyTask(
    assignmentId: string,
    user: User,
  ): Promise<Assignment> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id: assignmentId, organizationId: user.organizationId },
      relations: {
        assignees: true,
        task: {
          steps: {
            attachments: {
              document: true,
            },
          },
        },
      },
      order: {
        task: {
          steps: {
            position: 'ASC',
            attachments: {
              position: 'ASC',
            },
          },
        },
      },
    });

    const isAssignee = assignment?.assignees.some(
      (assignee) => assignee.userId === user.id,
    );

    if (!assignment || !isAssignee) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    return assignment;
  }

  private async completedStepIds(
    assignmentId: string,
    userId: string,
  ): Promise<Set<string>> {
    const completions = await this.completionsRepository.find({
      where: { assignmentId, userId },
    });

    return new Set(completions.map((completion) => completion.taskStepId));
  }

  private async notesByStep(
    assignmentId: string,
    userId: string,
  ): Promise<Map<string, string>> {
    const notes = await this.notesRepository.find({
      where: { assignmentId, userId },
    });

    return new Map(notes.map((note) => [note.taskStepId, note.notes]));
  }

  private async saveNote(
    assignmentId: string,
    userId: string,
    taskStepId: string,
    notes: string,
  ): Promise<void> {
    const existing = await this.notesRepository.findOne({
      where: { assignmentId, userId, taskStepId },
    });

    if (isRichTextBlank(notes)) {
      if (existing) await this.notesRepository.delete(existing.id);
      return;
    }

    if (existing) {
      existing.notes = notes;
      await this.notesRepository.save(existing);
      return;
    }

    await this.notesRepository.save(
      this.notesRepository.create({
        assignmentId,
        userId,
        taskStepId,
        notes,
      }),
    );
  }

  private async refreshCompletedAt(assignmentId: string): Promise<void> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) return;

    const derived = await this.progressByAssignment([assignment]);
    const complete = derived.get(assignmentId)?.complete ?? false;
    const today = new Date().toISOString().slice(0, 10);

    if (complete && !assignment.completedAt) {
      await this.assignmentsRepository.update(assignmentId, {
        completedAt: today,
      });
    } else if (!complete && assignment.completedAt) {
      await this.assignmentsRepository.update(assignmentId, {
        completedAt: null,
      });
    }
  }

  private async deleteCompletionsExcept(
    assignmentId: string,
    userIds: string[],
  ): Promise<void> {
    if (userIds.length === 0) {
      await this.completionsRepository.delete({ assignmentId });
      return;
    }

    await this.completionsRepository.delete({
      assignmentId,
      userId: Not(In(userIds)),
    });
  }
}

function emptyProgress(): DerivedAssignmentProgress {
  return { progress: 0, complete: false, byAssignee: new Map() };
}
