import { Expose } from 'class-transformer';

import { IsoDate } from '../../common/decorators/iso-date.decorator.js';
import { UserRole, UserStatus } from '../../users/entities/user.entity.js';

export class AuthUserDto {
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

  @Expose()
  organizationName!: string;

  /** True when this user is the only owner left in the organization. */
  @Expose()
  isLastOwner!: boolean;

  @Expose()
  avatar!: string;

  /** `false` for accounts that only ever signed in with Google or GitHub. */
  @Expose()
  hasPassword!: boolean;

  @Expose()
  assignmentNotificationEmails!: boolean;

  @Expose()
  @IsoDate()
  createdAt!: string;

  @Expose()
  @IsoDate()
  updatedAt!: string;
}

export class AuthTokensDto {
  @Expose()
  accessToken!: string;

  @Expose()
  refreshToken!: string;

  @Expose()
  user!: AuthUserDto;
}

export class InviteLookupDto {
  @Expose()
  status!: 'valid' | 'used' | 'invalid';

  @Expose()
  email?: string;

  @Expose()
  token?: string;
}

export class UserStatusDto {
  status!: UserStatus;
}
