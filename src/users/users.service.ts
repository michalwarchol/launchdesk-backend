import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { InviteToken } from '../auth/entities/invite-token.entity.js';
import { AppException } from '../common/exceptions/app.exception.js';
import {
  buildPaginationMeta,
  PaginatedResponse,
  parseSort,
  PaginationQueryDto,
} from '../common/dto/pagination.dto.js';
import { generateToken, hashToken } from '../common/utils/crypto.js';
import { MailService } from '../mail/mail.service.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { StorageService } from '../storage/storage.service.js';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateNotificationPreferencesDto,
  UpdateProfileDto,
  UpdateUserDto,
} from './dto/user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { AssignmentAssignee } from '../assignments/entities/assignment-assignee.entity.js';
import { User, UserRole, UserStatus } from './entities/user.entity.js';
import { Directories } from '../storage/utils/directories.js';

const USER_SORT_KEYS = [
  'firstName',
  'lastName',
  'email',
  'role',
  'createdAt',
] as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(InviteToken)
    private readonly inviteTokensRepository: Repository<InviteToken>,
    @InjectRepository(AssignmentAssignee)
    private readonly assignmentAssigneesRepository: Repository<AssignmentAssignee>,
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(
    query: PaginationQueryDto,
    organizationId: string,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const sort = parseSort(query.sort, USER_SORT_KEYS);
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .where('user.organizationId = :organizationId', { organizationId });

    qb.orderBy(
      sort ? `user.${sort.key}` : 'user.createdAt',
      sort?.direction ?? 'DESC',
    );

    qb.skip((query.page - 1) * query.pageSize).take(query.pageSize);

    const [users, total] = await qb.getManyAndCount();
    const ownerCount = await this.countOwners(organizationId);

    return {
      data: await Promise.all(
        users.map((user) => this.toResponse(user, ownerCount)),
      ),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findOne(id: string, organizationId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id, organizationId },
    });

    if (!user) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    return this.toResponse(user);
  }

  async create(dto: CreateUserDto, actor: User): Promise<UserResponseDto> {
    if (dto.role === UserRole.Owner && actor.role !== UserRole.Owner) {
      throw new AppException('cannotAssignOwner', HttpStatus.FORBIDDEN);
    }

    const existing = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new AppException('emailTaken', HttpStatus.CONFLICT);
    }

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email.toLowerCase(),
        role: dto.role,
        status: UserStatus.Invited,
        avatarUrl: '',
        organizationId: actor.organizationId,
      }),
    );

    await this.createInviteToken(user, actor);

    return this.toResponse(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: User,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id, organizationId: actor.organizationId },
    });

    if (!user) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    await this.assertCanChangeMember(user, actor, dto.role);

    if (dto.firstName !== undefined) user.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();
    if (dto.role !== undefined) user.role = dto.role;

    const saved = await this.usersRepository.save(user);
    return this.toResponse(saved);
  }

  async remove(id: string, actor: User): Promise<void> {
    if (id === actor.id) {
      throw new AppException('cannotDeleteSelf', HttpStatus.BAD_REQUEST);
    }

    const user = await this.usersRepository.findOne({
      where: { id, organizationId: actor.organizationId },
    });

    if (!user) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    if (user.role === UserRole.Owner && actor.role !== UserRole.Owner) {
      throw new AppException('cannotModifyOwner', HttpStatus.FORBIDDEN);
    }

    if (user.role === UserRole.Owner && (await this.isLastOwner(user))) {
      throw new AppException('lastOwner', HttpStatus.BAD_REQUEST);
    }

    await this.assignmentAssigneesRepository.delete({ userId: id });
    await this.usersRepository.softRemove(user);
  }

  async resendInvite(id: string, actor: User): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id, organizationId: actor.organizationId },
    });

    if (!user) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    if (user.role === UserRole.Owner && actor.role !== UserRole.Owner) {
      throw new AppException('cannotModifyOwner', HttpStatus.FORBIDDEN);
    }

    if (
      user.role === UserRole.Owner &&
      actor.id !== user.id &&
      (await this.isLastOwner(user))
    ) {
      throw new AppException('lastOwner', HttpStatus.BAD_REQUEST);
    }

    if (user.status !== UserStatus.Invited) {
      throw new AppException('alreadyActive', HttpStatus.BAD_REQUEST);
    }

    await this.createInviteToken(user, actor);
  }

  async updateProfile(
    user: User,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    if (dto.avatar !== undefined && !dto.avatar.startsWith('data:image/')) {
      throw new AppException('avatarInvalid', HttpStatus.BAD_REQUEST);
    }

    user.firstName = dto.firstName.trim();
    user.lastName = dto.lastName.trim();

    if (dto.avatar !== undefined) {
      const [, metadata, base64] =
        dto.avatar.match(/^data:(image\/[^;]+);base64,(.+)$/) ?? [];

      if (!metadata || !base64) {
        throw new AppException('avatarInvalid', HttpStatus.BAD_REQUEST);
      }

      const extension = metadata.split('/')[1] ?? 'png';
      const buffer = Buffer.from(base64, 'base64');
      const key = await this.storageService.uploadObject(
        Directories.Avatars,
        buffer,
        metadata,
        extension,
      );
      user.avatarUrl = key;
    }

    const saved = await this.usersRepository.save(user);
    return this.toResponse(saved);
  }

  async updateNotificationPreferences(
    user: User,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<{ assignmentNotificationEmails: boolean }> {
    user.assignmentNotificationEmails = dto.assignmentNotificationEmails;
    const saved = await this.usersRepository.save(user);

    return {
      assignmentNotificationEmails: saved.assignmentNotificationEmails,
    };
  }

  async changePassword(user: User, dto: ChangePasswordDto): Promise<void> {
    if (!user.passwordHash) {
      throw new AppException('oauthOnly', HttpStatus.BAD_REQUEST);
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);

    if (!valid) {
      throw new AppException('wrongPassword', HttpStatus.BAD_REQUEST);
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new AppException('sameAsCurrent', HttpStatus.BAD_REQUEST);
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepository.save(user);
  }

  async toResponse(user: User, ownerCount?: number): Promise<UserResponseDto> {
    const count = ownerCount ?? (await this.countOwners(user.organizationId));

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isLastOwner: user.role === UserRole.Owner && count <= 1,
      avatar:
        (await this.storageService.resolveDownloadUrl(user.avatarUrl)) ?? '',
      createdAt: user.createdAt.toISOString().slice(0, 10),
      updatedAt: user.updatedAt.toISOString().slice(0, 10),
    };
  }

  private async countOwners(organizationId: string): Promise<number> {
    return this.usersRepository.count({
      where: { organizationId, role: UserRole.Owner },
    });
  }

  private async isLastOwner(user: User): Promise<boolean> {
    if (user.role !== UserRole.Owner) return false;

    return (await this.countOwners(user.organizationId)) <= 1;
  }

  /**
   * Admins cannot touch an owner or grant the owner role.
   * Another owner can change a peer owner, but not the last one.
   * The last owner can still rename themselves here; they cannot leave the role.
   */
  private async assertCanChangeMember(
    user: User,
    actor: User,
    nextRole: UserRole | undefined,
  ): Promise<void> {
    const assigningOwner =
      nextRole === UserRole.Owner && actor.role !== UserRole.Owner;

    if (user.role === UserRole.Owner && actor.role !== UserRole.Owner) {
      throw new AppException('cannotModifyOwner', HttpStatus.FORBIDDEN);
    }

    if (assigningOwner) {
      throw new AppException('cannotAssignOwner', HttpStatus.FORBIDDEN);
    }

    const targetIsLastOwner = await this.isLastOwner(user);
    const leavingOwnerRole =
      targetIsLastOwner &&
      nextRole !== undefined &&
      nextRole !== UserRole.Owner;

    if (targetIsLastOwner && actor.id !== user.id) {
      throw new AppException('lastOwner', HttpStatus.BAD_REQUEST);
    }

    if (leavingOwnerRole) {
      throw new AppException('lastOwner', HttpStatus.BAD_REQUEST);
    }
  }

  private async createInviteToken(user: User, actor: User): Promise<void> {
    const organization = await this.organizationsRepository.findOne({
      where: { id: user.organizationId },
    });

    if (!organization) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.inviteTokensRepository.save(
      this.inviteTokensRepository.create({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
      }),
    );

    await this.mailService.sendInviteEmail(user.email, token, {
      firstName: user.firstName,
      inviterName: `${actor.firstName} ${actor.lastName}`.trim(),
      organizationName: organization.name,
    });
  }
}
