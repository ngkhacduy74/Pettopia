"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityLoggerMiddleware = void 0;
const common_1 = require("@nestjs/common");
let SecurityLoggerMiddleware = class SecurityLoggerMiddleware {
    logger = new common_1.Logger('Security');
    use(req, res, next) {
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
    isSuspicious(req) {
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
};
exports.SecurityLoggerMiddleware = SecurityLoggerMiddleware;
exports.SecurityLoggerMiddleware = SecurityLoggerMiddleware = __decorate([
    (0, common_1.Injectable)()
], SecurityLoggerMiddleware);
//# sourceMappingURL=security-logger.middleware.js.map