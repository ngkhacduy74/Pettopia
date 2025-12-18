import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('Security');

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl, ip, headers } = req;
        const userAgent = headers['user-agent'] || '';

        if (this.isSuspicious(req)) {
            this.logger.warn(`Suspicious request detected: ${method} ${originalUrl} from ${ip}`, {
                userAgent,
                body: req.body,
                query: req.query,
            });
        }

        next();
    }

    private isSuspicious(req: Request): boolean {
        const suspiciousPatterns = [
            /select.*from/i,
            /union.*select/i,
            /<script>/i,
            /javascript:/i,
            /\.\.\//,
            /drop\s+table/i,
            /insert\s+into/i,
            /delete\s+from/i,
            /exec\(/i,
            /eval\(/i,
        ];

        const requestString = JSON.stringify({
            url: req.url,
            body: req.body,
            query: req.query,
        });

        return suspiciousPatterns.some(pattern => pattern.test(requestString));
    }
}
