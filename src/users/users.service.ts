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
import { StorageService } from '../storage/storage.service.js';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateProfileDto,
  UpdateUserDto,
} from './dto/user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { User, UserStatus } from './entities/user.entity.js';
import { Directories } from '../storage/utils/directories.js';

const USER_SORT_KEYS = ['firstName', 'lastName', 'email', 'role', 'createdAt'] as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(InviteToken)
    private readonly inviteTokensRepository: Repository<InviteToken>,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<UserResponseDto>> {
    const sort = parseSort(query.sort, USER_SORT_KEYS);
    const qb = this.usersRepository.createQueryBuilder('user');

    qb.orderBy(
      sort ? `user.${sort.key}` : 'user.createdAt',
      sort?.direction ?? 'DESC',
    );

    qb.skip((query.page - 1) * query.pageSize).take(query.pageSize);

    const [users, total] = await qb.getManyAndCount();

    return {
      data: await Promise.all(users.map((user) => this.toResponse(user))),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    return this.toResponse(user);
  }

  async create(dto: CreateUserDto, organizationId: string): Promise<UserResponseDto> {
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
        organizationId,
      }),
    );

    await this.createInviteToken(user);

    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();
    if (dto.role !== undefined) user.role = dto.role;

    const saved = await this.usersRepository.save(user);
    return this.toResponse(saved);
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new AppException('cannotDeleteSelf', HttpStatus.BAD_REQUEST);
    }

    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    await this.usersRepository.softRemove(user);
  }

  async resendInvite(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new AppException('notFound', HttpStatus.NOT_FOUND);
    }

    if (user.status !== UserStatus.Invited) {
      throw new AppException('alreadyActive', HttpStatus.BAD_REQUEST);
    }

    await this.createInviteToken(user);
  }

  async updateProfile(user: User, dto: UpdateProfileDto): Promise<UserResponseDto> {
    if (dto.avatar !== undefined && !dto.avatar.startsWith('data:image/')) {
      throw new AppException('avatarInvalid', HttpStatus.BAD_REQUEST);
    }

    user.firstName = dto.firstName.trim();
    user.lastName = dto.lastName.trim();

    if (dto.avatar !== undefined) {
      const [, metadata, base64] = dto.avatar.match(/^data:(image\/[^;]+);base64,(.+)$/) ?? [];

      if (!metadata || !base64) {
        throw new AppException('avatarInvalid', HttpStatus.BAD_REQUEST);
      }

      const extension = metadata.split('/')[1] ?? 'png';
      const buffer = Buffer.from(base64, 'base64');
      const key = await this.storageService.uploadObject(Directories.Avatars, buffer, metadata, extension);
      user.avatarUrl = key;
    }

    const saved = await this.usersRepository.save(user);
    return this.toResponse(saved);
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

  async toResponse(user: User): Promise<UserResponseDto> {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: (await this.storageService.resolveDownloadUrl(user.avatarUrl)) ?? '',
      createdAt: user.createdAt.toISOString().slice(0, 10),
      updatedAt: user.updatedAt.toISOString().slice(0, 10),
    };
  }

  private async createInviteToken(user: User): Promise<void> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.inviteTokensRepository.save(
      this.inviteTokensRepository.create({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
      }),
    );

    await this.mailService.sendInviteEmail(user.email, token);
  }
}
