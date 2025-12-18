import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const SKIP_CSRF = 'skip_csrf';

@Injectable()
export class CsrfGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {

        const skipCsrf = this.reflector.get<boolean>(SKIP_CSRF, context.getHandler());
        if (skipCsrf) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();


        if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
            return true;
        }

        const csrfTokenFromHeader = request.headers['x-csrf-token'] as string;
        const csrfTokenFromCookie = request.cookies['XSRF-TOKEN'];

        if (!csrfTokenFromHeader || !csrfTokenFromCookie) {
            throw new ForbiddenException('CSRF token missing');
        }

        if (csrfTokenFromHeader !== csrfTokenFromCookie) {
            throw new ForbiddenException('CSRF token mismatch');
        }

        return true;
    }
}
