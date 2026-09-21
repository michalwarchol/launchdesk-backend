import { Expose } from 'class-transformer';

import { IsoDate } from '../../common/decorators/iso-date.decorator.js';
import { DocumentType } from '../entities/document.entity.js';

export class DocumentResponseDto {
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

  @Expose()
  @IsoDate()
  createdAt!: string;
}
