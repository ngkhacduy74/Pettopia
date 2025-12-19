"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanitizeResponseInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let SanitizeResponseInterceptor = class SanitizeResponseInterceptor {
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.map)((data) => this.sanitize(data)));
    }
    sanitize(data) {
        if (typeof data === 'string') {
            return this.escapeHtml(data);
        }
        if (Array.isArray(data)) {
            return data.map(item => this.sanitize(item));
        }
        if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const key in data) {
                sanitized[key] = this.sanitize(data[key]);
            }
            return sanitized;
        }
        return data;
    }
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
            '/': '&#x2F;',
        };
        return text.replace(/[&<>"'/]/g, (char) => map[char]);
    }
};
exports.SanitizeResponseInterceptor = SanitizeResponseInterceptor;
exports.SanitizeResponseInterceptor = SanitizeResponseInterceptor = __decorate([
    (0, common_1.Injectable)()
], SanitizeResponseInterceptor);
//# sourceMappingURL=sanitize-response.interceptor.js.map