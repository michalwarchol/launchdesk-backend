import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserStatus } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { OAuthProvider, OAuthAccount } from './entities/oauth-account.entity.js';
import { OAuthProfile } from './strategies/google.strategy.js';

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(OAuthAccount)
    private readonly oauthAccountsRepository: Repository<OAuthAccount>,
    private readonly authService: AuthService,
  ) {}

  /**
   * A stored provider link decides who signs in. The provider email is only used the first time a
   * provider account is seen, to attach it to the member with that address.
   */
  async handleCallback(profile: OAuthProfile): Promise<string> {
    const provider = profile.provider === 'google' ? OAuthProvider.Google : OAuthProvider.Github;

    const link = await this.oauthAccountsRepository.findOne({
      where: { provider, providerAccountId: profile.providerAccountId },
    });

    if (link) {
      // Looked up by id so that a soft-deleted member stays out. The link is never moved to
      // whoever holds that email now.
      const linkedUser = await this.usersRepository.findOne({ where: { id: link.userId } });

      if (!linkedUser) {
        throw new Error('noAccount');
      }

      await this.activateIfInvited(linkedUser);

      return this.authService.createOAuthExchangeCode(linkedUser.id);
    }

    const user = await this.usersRepository.findOne({
      where: { email: profile.email.toLowerCase() },
    });

    if (!user) {
      throw new Error('noAccount');
    }

    await this.activateIfInvited(user);

    await this.oauthAccountsRepository.save(
      this.oauthAccountsRepository.create({
        userId: user.id,
        provider,
        providerAccountId: profile.providerAccountId,
      }),
    );

    return this.authService.createOAuthExchangeCode(user.id);
  }

  private async activateIfInvited(user: User): Promise<void> {
    if (user.status === UserStatus.Invited) {
      user.status = UserStatus.Active;
      await this.usersRepository.save(user);
    }
  }
}
