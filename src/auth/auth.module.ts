import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from '../mail/mail.module.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { InviteToken } from './entities/invite-token.entity.js';
import { OAuthAccount } from './entities/oauth-account.entity.js';
import { OAuthExchangeCode } from './entities/oauth-exchange-code.entity.js';
import { PasswordResetToken } from './entities/password-reset-token.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { OAuthService } from './oauth.service.js';
import { GithubStrategy } from './strategies/github.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET')!,
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_TTL')! as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Organization,
      RefreshToken,
      InviteToken,
      PasswordResetToken,
      OAuthAccount,
      OAuthExchangeCode,
    ]),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OAuthService,
    JwtStrategy,
    GoogleStrategy,
    GithubStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
