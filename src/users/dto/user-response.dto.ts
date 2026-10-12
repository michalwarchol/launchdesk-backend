import { Expose } from 'class-transformer';

import { IsoDate } from '../../common/decorators/iso-date.decorator.js';
import { UserRole } from '../entities/user.entity.js';

export class UserResponseDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  role!: UserRole;

  /** True when this user is the only owner left in the organization. */
  @Expose()
  isLastOwner!: boolean;

  @Expose()
  avatar!: string;

  @Expose()
  @IsoDate()
  createdAt!: string;

  @Expose()
  @IsoDate()
  updatedAt!: string;
}
