import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

import { OAuthProfile } from './google.strategy.js';

/**
 * With `allRawEmails` GitHub returns every address with its `primary` and `verified` flags. Only the
 * primary address that GitHub has verified may identify a member.
 */
export function pickVerifiedGithubEmail(
  emails: { value: string; primary?: boolean; verified?: boolean }[] | undefined,
): string | undefined {
  return emails?.find((email) => email.primary === true && email.verified === true && email.value)
    ?.value;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID') || 'disabled-client-id',
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET') || 'disabled-client-secret',
      callbackURL: config.get<string>('GITHUB_CALLBACK_URL') ?? 'http://localhost:4000/api/auth/github/callback',
      scope: ['user:email'],
      allRawEmails: true,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string; primary?: boolean; verified?: boolean }[];
    },
    done: (error: Error | null, user?: OAuthProfile | false) => void,
  ): void {
    const email = pickVerifiedGithubEmail(profile.emails);

    if (!email) {
      done(new Error('providerFailed'), false);
      return;
    }

    done(null, {
      provider: 'github',
      providerAccountId: profile.id,
      email,
    });
  }
}
