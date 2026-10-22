import { Expose, Type } from 'class-transformer';

import { IsoDate } from '../../common/decorators/iso-date.decorator.js';

export class AssignmentAssigneeStepNoteDto {
  @Expose()
  stepId!: string;

  @Expose()
  stepName!: string;

  @Expose()
  notes!: string;
}

export class AssignmentAssigneeDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  avatar?: string;

  /** This assignee's completed-step ratio. */
  @Expose()
  progress!: number;

  @Expose()
  @Type(() => AssignmentAssigneeStepNoteDto)
  stepNotes?: AssignmentAssigneeStepNoteDto[];
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
