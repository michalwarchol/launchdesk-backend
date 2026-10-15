import { Expose, Type } from 'class-transformer';

import { IsoDate } from '../../common/decorators/iso-date.decorator.js';
import { DocumentType } from '../../documents/entities/document.entity.js';

export class MyTaskAttachmentDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  type!: DocumentType;

  @Expose()
  extension!: string;

  @Expose()
  size!: number;
}

export class MyTaskStepDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string;

  @Expose()
  completed!: boolean;

  @Expose()
  notesRequired!: boolean;

  @Expose()
  notes!: string;

  @Expose()
  @Type(() => MyTaskAttachmentDto)
  attachments!: MyTaskAttachmentDto[];
}

export class MyTaskDetailDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string;

  @Expose()
  @IsoDate()
  dueDate!: string;

  @Expose()
  progress!: number;

  @Expose()
  @Type(() => MyTaskStepDto)
  steps!: MyTaskStepDto[];
}
