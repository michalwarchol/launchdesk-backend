import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { AppException } from '../common/exceptions/app.exception.js';
import { generateToken, hashToken } from '../common/utils/crypto.js';
import { MailService } from '../mail/mail.service.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { User, UserRole, UserStatus } from '../users/entities/user.entity.js';
import { AcceptInviteDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto.js';
import { AuthTokensDto, AuthUserDto, InviteLookupDto } from './dto/auth-response.dto.js';
import { InviteToken } from './entities/invite-token.entity.js';
import { OAuthExchangeCode } from './entities/oauth-exchange-code.entity.js';
import { PasswordResetToken } from './entities/password-reset-token.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
    @InjectRepository(InviteToken)
    private readonly inviteTokensRepository: Repository<InviteToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokensRepository: Repository<PasswordResetToken>,
    @InjectRepository(OAuthExchangeCode)
    private readonly oauthExchangeCodesRepository: Repository<OAuthExchangeCode>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new AppException('emailTaken', HttpStatus.CONFLICT);
    }

    const organization = await this.organizationsRepository.save(
      this.organizationsRepository.create({ name: dto.organizationName.trim() }),
    );

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: UserRole.Admin,
        status: UserStatus.Active,
        avatarUrl: '',
        organizationId: organization.id,
      }),
    );

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new AppException('invalidCredentials', HttpStatus.UNAUTHORIZED);
    }

    if (user.status === UserStatus.Invited) {
      throw new AppException('invitePending', HttpStatus.UNAUTHORIZED);
    }

    if (!user.passwordHash) {
      throw new AppException('oauthOnly', HttpStatus.UNAUTHORIZED);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) {
      throw new AppException('invalidCredentials', HttpStatus.UNAUTHORIZED);
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.refreshTokensRepository.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!stored) {
      throw new AppException('invalidRefreshToken', HttpStatus.UNAUTHORIZED);
    }

    stored.revokedAt = new Date();
    await this.refreshTokensRepository.save(stored);

    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.refreshTokensRepository.findOne({
      where: { tokenHash },
    });

    if (stored) {
      stored.revokedAt = new Date();
      await this.refreshTokensRepository.save(stored);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      return;
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.passwordResetTokensRepository.save(
      this.passwordResetTokensRepository.create({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
      }),
    );

    await this.mailService.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const stored = await this.passwordResetTokensRepository.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!stored) {
      throw new AppException('invalidToken', HttpStatus.BAD_REQUEST);
    }

    stored.usedAt = new Date();
    stored.user.passwordHash = await bcrypt.hash(dto.password, 10);
    stored.user.status = UserStatus.Active;

    await this.passwordResetTokensRepository.save(stored);
    await this.usersRepository.save(stored.user);
  }

  async lookupInvite(token: string): Promise<InviteLookupDto> {
    const tokenHash = hashToken(token);
    const stored = await this.inviteTokensRepository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      return { status: 'invalid' };
    }

    if (stored.usedAt || stored.user.status === UserStatus.Active) {
      return { status: 'used', email: stored.user.email };
    }

    return { status: 'valid', email: stored.user.email, token };
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<AuthTokensDto> {
    const tokenHash = hashToken(dto.token);
    const stored = await this.inviteTokensRepository.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!stored) {
      throw new AppException('invalidToken', HttpStatus.BAD_REQUEST);
    }

    if (stored.user.status === UserStatus.Active) {
      throw new AppException('tokenUsed', HttpStatus.BAD_REQUEST);
    }

    stored.usedAt = new Date();
    stored.user.passwordHash = await bcrypt.hash(dto.password, 10);
    stored.user.status = UserStatus.Active;

    await this.inviteTokensRepository.save(stored);
    await this.usersRepository.save(stored.user);

    return this.issueTokens(stored.user);
  }

  async createOAuthExchangeCode(userId: string): Promise<string> {
    const code = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await this.oauthExchangeCodesRepository.save(
      this.oauthExchangeCodesRepository.create({
        userId,
        codeHash: hashToken(code),
        expiresAt,
      }),
    );

    return code;
  }

  async exchangeOAuthCode(code: string): Promise<AuthTokensDto> {
    const codeHash = hashToken(code);
    const stored = await this.oauthExchangeCodesRepository.findOne({
      where: {
        codeHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!stored) {
      throw new AppException('invalidToken', HttpStatus.BAD_REQUEST);
    }

    stored.usedAt = new Date();
    await this.oauthExchangeCodesRepository.save(stored);

    return this.issueTokens(stored.user);
  }

  toAuthUser(user: User): AuthUserDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatarUrl ?? '',
      createdAt: user.createdAt.toISOString().slice(0, 10),
      updatedAt: user.updatedAt.toISOString().slice(0, 10),
    };
  }

  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET')!,
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL')! as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const refreshToken = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: this.toAuthUser(user),
    };
  }
}
