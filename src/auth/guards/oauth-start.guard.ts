import { ExecutionContext, Injectable, mixin, Type } from '@nestjs/common';
import { AuthGuard, IAuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

export function sanitizeNext(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return undefined;
  }

  return value;
}

export function OAuthStartGuard(provider: 'google' | 'github'): Type<IAuthGuard> {
  @Injectable()
  class OAuthStartGuardMixin extends AuthGuard(provider) {
    getAuthenticateOptions(context: ExecutionContext): { state?: string } {
      const request = context.switchToHttp().getRequest<Request>();
      const next = sanitizeNext(request.query.next);

      return next ? { state: next } : {};
    }
  }

  return mixin(OAuthStartGuardMixin);
}
