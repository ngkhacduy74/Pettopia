"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    logger = new common_1.Logger('GlobalExceptionFilter');
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let details = null;
        if (exception instanceof common_1.HttpException) {
            statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object') {
                const response = exceptionResponse;
                message = response.message || response.error || message;
                details = response.details || null;
            }
        }
        else if (exception instanceof Error) {
            message = exception.message;
            if (process.env.NODE_ENV === 'development') {
                details = {
                    stack: exception.stack,
                    name: exception.name,
                };
            }
        }
        this.logger.error(`[${statusCode}] ${request.method} ${request.url} - ${message}`, exception instanceof Error ? exception.stack : undefined);
        const responseBody = {
            statusCode,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        if (details && (process.env.NODE_ENV === 'development' || details.userFacing)) {
            responseBody.details = details;
        }
        return response.status(statusCode).json(responseBody);
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map