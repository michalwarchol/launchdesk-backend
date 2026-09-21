import { Expose, Type } from 'class-transformer';

import { IsoDate } from '../../common/decorators/iso-date.decorator.js';
import { DocumentResponseDto } from '../../documents/dto/document-response.dto.js';

export class TaskStepResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string;

  @Expose()
  position!: number;

  @Expose()
  @Type(() => DocumentResponseDto)
  attachments!: DocumentResponseDto[];
}

export class TaskListItemDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string;

  @Expose()
  stepsCount!: number;

  @Expose()
  @IsoDate()
  createdAt!: string;
}

export class TaskDetailDto extends TaskListItemDto {
  @Expose()
  @Type(() => TaskStepResponseDto)
  steps!: TaskStepResponseDto[];
}
