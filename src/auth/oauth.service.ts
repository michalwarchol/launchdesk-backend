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

  async handleCallback(profile: OAuthProfile): Promise<string> {
    const user = await this.usersRepository.findOne({
      where: { email: profile.email.toLowerCase() },
    });

    if (!user) {
      throw new Error('noAccount');
    }

    if (user.status === UserStatus.Invited) {
      user.status = UserStatus.Active;
      await this.usersRepository.save(user);
    }

    const provider = profile.provider === 'google' ? OAuthProvider.Google : OAuthProvider.Github;

    const existing = await this.oauthAccountsRepository.findOne({
      where: {
        provider,
        providerAccountId: profile.providerAccountId,
      },
    });

    if (!existing) {
      await this.oauthAccountsRepository.save(
        this.oauthAccountsRepository.create({
          userId: user.id,
          provider,
          providerAccountId: profile.providerAccountId,
        }),
      );
    }

    return this.authService.createOAuthExchangeCode(user.id);
  }
}
