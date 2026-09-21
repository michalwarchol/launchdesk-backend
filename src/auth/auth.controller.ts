import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import {
  AcceptInviteDto,
  ForgotPasswordDto,
  LoginDto,
  OAuthExchangeDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto.js';
import { OAuthService } from './oauth.service.js';
import { OAuthProfile } from './strategies/google.strategy.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  me(@CurrentUser() user: User) {
    return this.authService.toAuthUser(user);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(204)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(204)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
  }

  @Public()
  @Get('invite')
  lookupInvite(@Query('token') token: string) {
    return this.authService.lookupInvite(token);
  }

  @Public()
  @Post('invite/accept')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }

  @Public()
  @Post('oauth/exchange')
  exchangeOAuth(@Body() dto: OAuthExchangeDto) {
    return this.authService.exchangeOAuthCode(dto.code);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    return;
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: OAuthProfile },
    @Res() res: Response,
    @Query('next') next?: string,
  ) {
    return this.handleOAuthCallback(req.user, res, next);
  }

  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    return;
  }

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(
    @Req() req: Request & { user: OAuthProfile },
    @Res() res: Response,
    @Query('next') next?: string,
  ) {
    return this.handleOAuthCallback(req.user, res, next);
  }

  private async handleOAuthCallback(
    profile: OAuthProfile,
    res: Response,
    next?: string,
  ): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');

    try {
      const code = await this.oauthService.handleCallback(profile);
      const redirectUrl = new URL('/login', frontendUrl);
      redirectUrl.searchParams.set('code', code);

      if (next) {
        redirectUrl.searchParams.set('next', next);
      }

      res.redirect(redirectUrl.toString());
    } catch (error) {
      const redirectUrl = new URL('/login', frontendUrl);
      const code = error instanceof Error && error.message === 'noAccount'
        ? 'noAccount'
        : 'providerFailed';
      redirectUrl.searchParams.set('error', code);
      res.redirect(redirectUrl.toString());
    }
  }
}
