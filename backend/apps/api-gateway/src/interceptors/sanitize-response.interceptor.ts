import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SanitizeResponseInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => this.sanitize(data)),
        );
    }

    private sanitize(data: any): any {
        if (typeof data === 'string') {
            return this.escapeHtml(data);
        }

        if (Array.isArray(data)) {
            return data.map(item => this.sanitize(item));
        }

        if (typeof data === 'object' && data !== null) {
            const sanitized: any = {};
            for (const key in data) {
                sanitized[key] = this.sanitize(data[key]);
            }
            return sanitized;
        }

        return data;
    }

    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
            '/': '&#x2F;',
        };
        return text.replace(/[&<>"'/]/g, (char) => map[char]);
    }
}
