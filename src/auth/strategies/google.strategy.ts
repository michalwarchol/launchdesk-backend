import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

export interface OAuthProfile {
  provider: 'google' | 'github';
  providerAccountId: string;
  email: string;
}

/**
 * Returns the profile email only when Google marks it verified (`email_verified`). A missing flag
 * counts as unverified.
 */
export function pickVerifiedGoogleEmail(
  emails: { value: string; verified?: boolean }[] | undefined,
): string | undefined {
  const first = emails?.[0];

  return first?.verified === true && first.value ? first.value : undefined;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'disabled-client-id',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'disabled-client-secret',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') ?? 'http://localhost:4000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { id: string; emails?: { value: string; verified?: boolean }[] },
    done: VerifyCallback,
  ): void {
    const email = pickVerifiedGoogleEmail(profile.emails);

    if (!email) {
      done(new Error('providerFailed'), false);
      return;
    }

    done(null, {
      provider: 'google',
      providerAccountId: profile.id,
      email,
    } satisfies OAuthProfile);
  }
}
