import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class IpFilterGuard implements CanActivate {
    private readonly blacklistedIps: string[] = process.env.BLACKLISTED_IPS?.split(',').filter(ip => ip.trim()) || [];
    private readonly whitelistedIps: string[] = process.env.WHITELISTED_IPS?.split(',').filter(ip => ip.trim()) || [];

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const clientIp = this.getClientIp(request);


        if (this.whitelistedIps.length > 0) {
            if (!this.whitelistedIps.includes(clientIp)) {
                throw new ForbiddenException('Access denied from your IP address');
            }
            return true;
        }


        if (this.blacklistedIps.includes(clientIp)) {
            throw new ForbiddenException('Your IP address has been blocked');
        }

        return true;
    }

    private getClientIp(request: Request): string {
        return (
            (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            request.headers['x-real-ip'] as string ||
            request.socket.remoteAddress ||
            ''
        );
    }
}
