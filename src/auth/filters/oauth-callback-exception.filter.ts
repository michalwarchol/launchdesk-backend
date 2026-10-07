import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { sanitizeNext } from '../guards/oauth-start.guard.js';

@Catch()
export class OAuthCallbackExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthCallbackExceptionFilter.name);

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    this.logger.warn(
      `OAuth callback failed: ${exception instanceof Error ? exception.message : 'unknown error'}`,
    );

    const redirectUrl = new URL('/login', this.config.get<string>('FRONTEND_URL'));
    redirectUrl.searchParams.set('error', 'providerFailed');

    const next = sanitizeNext(request.query.state);

    if (next) {
      redirectUrl.searchParams.set('next', next);
    }

    response.redirect(redirectUrl.toString());
  }
}
