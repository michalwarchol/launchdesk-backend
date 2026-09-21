import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { AppException } from '../common/exceptions/app.exception.js';
import {
  buildPaginationMeta,
  PaginatedResponse,
  parseSort,
  PaginationQueryDto,
} from '../common/dto/pagination.dto.js';
import { DocumentsService } from '../documents/documents.service.js';
import { Document } from '../documents/entities/document.entity.js';
import { User } from '../users/entities/user.entity.js';
import {
  CreateTaskDto,
  CreateTaskStepDto,
  ReorderStepsDto,
  UpdateTaskDto,
  UpdateTaskStepDto,
} from './dto/task.dto.js';
import { TaskDetailDto, TaskListItemDto, TaskStepResponseDto } from './dto/task-response.dto.js';
import { TaskStepAttachment } from './entities/task-step-attachment.entity.js';
import { TaskStep } from './entities/task-step.entity.js';
import { Task } from './entities/task.entity.js';

const TASK_SORT_KEYS = ['name', 'createdAt'] as const;

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskStep)
    private readonly taskStepsRepository: Repository<TaskStep>,
    @InjectRepository(TaskStepAttachment)
    private readonly taskStepAttachmentsRepository: Repository<TaskStepAttachment>,
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
    private readonly documentsService: DocumentsService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<TaskListItemDto>> {
    const sort = parseSort(query.sort, TASK_SORT_KEYS);
    const [tasks, total] = await this.tasksRepository.findAndCount({
      relations: { steps: true },
      order: {
        [sort?.key ?? 'createdAt']: sort?.direction ?? 'DESC',
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    return {
      data: tasks.map((task: Task & { steps?: TaskStep[] }) =>
        this.toListItem({ ...task, stepsCount: task.steps?.length ?? 0 }),
      ),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findOne(id: string): Promise<TaskDetailDto> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: {
        steps: {
          attachments: {
            document: true,
          },
        },
      },
      order: {
        steps: {
          position: 'ASC',
          attachments: {
            position: 'ASC',
          },
        },
      },
    });

    if (!task) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    return this.toDetail(task);
  }

  async create(dto: CreateTaskDto, user: User): Promise<TaskDetailDto> {
    return this.dataSource.transaction(async (manager) => {
      const task = await manager.save(
        manager.create(Task, {
          name: dto.name.trim(),
          description: dto.description.trim(),
          createdById: user.id,
        }),
      );

      await this.saveSteps(manager, task.id, dto.steps);

      const created = await manager.findOne(Task, {
        where: { id: task.id },
        relations: {
          steps: {
            attachments: {
              document: true,
            },
          },
        },
        order: {
          steps: {
            position: 'ASC',
            attachments: {
              position: 'ASC',
            },
          },
        },
      });

      return this.toDetail(created!);
    });
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskDetailDto> {
    const task = await this.tasksRepository.findOne({ where: { id } });

    if (!task) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    if (dto.name !== undefined) task.name = dto.name.trim();
    if (dto.description !== undefined) task.description = dto.description.trim();

    await this.tasksRepository.save(task);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const task = await this.tasksRepository.findOne({ where: { id } });

    if (!task) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    await this.tasksRepository.remove(task);
  }

  async addStep(taskId: string, dto: CreateTaskStepDto): Promise<TaskStepResponseDto> {
    const task = await this.tasksRepository.findOne({ where: { id: taskId } });

    if (!task) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    const position = await this.taskStepsRepository.count({ where: { taskId } });
    const step = await this.taskStepsRepository.save(
      this.taskStepsRepository.create({
        taskId,
        name: dto.name.trim(),
        description: dto.description,
        position,
      }),
    );

    await this.replaceAttachments(step.id, dto.attachmentIds);

    const saved = await this.taskStepsRepository.findOne({
      where: { id: step.id },
      relations: { attachments: { document: true } },
      order: { attachments: { position: 'ASC' } },
    });

    return this.toStepResponse(saved!);
  }

  async updateStep(
    taskId: string,
    stepId: string,
    dto: UpdateTaskStepDto,
  ): Promise<TaskStepResponseDto> {
    const step = await this.taskStepsRepository.findOne({
      where: { id: stepId, taskId },
    });

    if (!step) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    if (dto.name !== undefined) step.name = dto.name.trim();
    if (dto.description !== undefined) step.description = dto.description;

    await this.taskStepsRepository.save(step);

    if (dto.attachmentIds !== undefined) {
      await this.replaceAttachments(step.id, dto.attachmentIds);
    }

    const saved = await this.taskStepsRepository.findOne({
      where: { id: step.id },
      relations: { attachments: { document: true } },
      order: { attachments: { position: 'ASC' } },
    });

    return this.toStepResponse(saved!);
  }

  async removeStep(taskId: string, stepId: string): Promise<void> {
    const step = await this.taskStepsRepository.findOne({
      where: { id: stepId, taskId },
    });

    if (!step) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    await this.taskStepsRepository.remove(step);
  }

  async reorderSteps(taskId: string, dto: ReorderStepsDto): Promise<TaskDetailDto> {
    const steps = await this.taskStepsRepository.find({ where: { taskId } });

    if (steps.length !== dto.stepIds.length) {
      throw new AppException('invalidReorder', HttpStatus.BAD_REQUEST);
    }

    const stepMap = new Map(steps.map((step) => [step.id, step]));

    for (const [index, stepId] of dto.stepIds.entries()) {
      const step = stepMap.get(stepId);

      if (!step) {
        throw new AppException('invalidReorder', HttpStatus.BAD_REQUEST);
      }

      step.position = index;
    }

    await this.taskStepsRepository.save(steps);
    return this.findOne(taskId);
  }

  private async saveSteps(
    manager: typeof this.dataSource.manager,
    taskId: string,
    steps: CreateTaskStepDto[],
  ): Promise<void> {
    for (const [index, stepDto] of steps.entries()) {
      const step = await manager.save(
        manager.create(TaskStep, {
          taskId,
          name: stepDto.name.trim(),
          description: stepDto.description,
          position: index,
        }),
      );

      if (stepDto.attachmentIds.length > 0) {
        const documents = await manager.find(Document, {
          where: { id: In(stepDto.attachmentIds) },
        });

        if (documents.length !== stepDto.attachmentIds.length) {
          throw new AppException('invalidAttachment', HttpStatus.BAD_REQUEST);
        }

        await manager.save(
          stepDto.attachmentIds.map((documentId, attachmentIndex) =>
            manager.create(TaskStepAttachment, {
              taskStepId: step.id,
              documentId,
              position: attachmentIndex,
            }),
          ),
        );
      }
    }
  }

  private async replaceAttachments(stepId: string, attachmentIds: string[]): Promise<void> {
    await this.taskStepAttachmentsRepository.delete({ taskStepId: stepId });

    if (attachmentIds.length === 0) {
      return;
    }

    const documents = await this.documentsRepository.find({
      where: { id: In(attachmentIds) },
    });

    if (documents.length !== attachmentIds.length) {
      throw new AppException('invalidAttachment', HttpStatus.BAD_REQUEST);
    }

    await this.taskStepAttachmentsRepository.save(
      attachmentIds.map((documentId, index) =>
        this.taskStepAttachmentsRepository.create({
          taskStepId: stepId,
          documentId,
          position: index,
        }),
      ),
    );
  }

  private toListItem(task: Task & { stepsCount?: number }): TaskListItemDto {
    return {
      id: task.id,
      name: task.name,
      description: task.description,
      stepsCount: task.stepsCount ?? 0,
      createdAt: task.createdAt.toISOString().slice(0, 10),
    };
  }

  private toDetail(task: Task): TaskDetailDto {
    return {
      ...this.toListItem({ ...task, stepsCount: task.steps?.length ?? 0 }),
      steps: (task.steps ?? []).map((step) => this.toStepResponse(step)),
    };
  }

  private toStepResponse(step: TaskStep): TaskStepResponseDto {
    return {
      id: step.id,
      name: step.name,
      description: step.description,
      position: step.position,
      attachments: (step.attachments ?? []).map((attachment) =>
        this.documentsService.toResponse(attachment.document),
      ),
    };
  }
}
