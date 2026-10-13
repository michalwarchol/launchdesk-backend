import { Expose } from 'class-transformer';

import { IsoDate } from '../../common/decorators/iso-date.decorator.js';

export class MyAssignmentResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string;

  @Expose()
  @IsoDate()
  dueDate!: string;
}
