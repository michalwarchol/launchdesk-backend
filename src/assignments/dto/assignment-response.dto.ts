import { Expose, Type } from 'class-transformer';

import { IsoDate } from '../../common/decorators/iso-date.decorator.js';

export class AssignmentAssigneeDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  avatar?: string;
}

export class AssignmentResponseDto {
  @Expose()
  id!: string;

  @Expose()
  taskId!: string;

  @Expose()
  taskName!: string;

  @Expose()
  @Type(() => AssignmentAssigneeDto)
  assignees!: AssignmentAssigneeDto[];

  @Expose()
  progress!: number;

  @Expose()
  @IsoDate()
  dueDate!: string;

  @Expose()
  @IsoDate()
  createdAt!: string;

  @Expose()
  @IsoDate()
  completedAt?: string | null;
}
