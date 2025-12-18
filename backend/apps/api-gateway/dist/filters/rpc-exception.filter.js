"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcToHttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
let RpcToHttpExceptionFilter = class RpcToHttpExceptionFilter {
    logger = new common_1.Logger('RpcExceptionFilter');
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const error = exception.getError();
        let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let details = null;
        try {
            if (typeof error === 'object' && error !== null) {
                const err = error;
                statusCode = err.statusCode || err.status || err.code || common_1.HttpStatus.INTERNAL_SERVER_ERROR;
                message = err.message || err.error || err.msg || message;
                if (err.details || err.data || err.errorDetails) {
                    details = err.details || err.data || err.errorDetails;
                }
                if (err.error && typeof err.error === 'object') {
                    const nestedError = err.error;
                    statusCode = nestedError.statusCode || nestedError.status || statusCode;
                    message = nestedError.message || message;
                }
            }
            else if (typeof error === 'string') {
                try {
                    const parsed = JSON.parse(error);
                    statusCode = parsed.statusCode || parsed.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR;
                    message = parsed.message || error;
                    details = parsed.details || parsed.error || parsed.data;
                }
                catch {
                    message = error;
                }
            }
            else if (typeof error === 'number') {
                statusCode = error;
            }
        }
        catch (err) {
            this.logger.error('Error processing RPC exception:', err);
        }
        if (statusCode < 100 || statusCode > 599) {
            statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        }
        this.logger.error(`[RPC Error] ${request.method} ${request.url} - ${statusCode}: ${message}`);
        const responseBody = {
            statusCode,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        if (details) {
            responseBody.details = details;
        }
        return response.status(statusCode).json(responseBody);
    }
};
exports.RpcToHttpExceptionFilter = RpcToHttpExceptionFilter;
exports.RpcToHttpExceptionFilter = RpcToHttpExceptionFilter = __decorate([
    (0, common_1.Catch)(microservices_1.RpcException)
], RpcToHttpExceptionFilter);
//# sourceMappingURL=rpc-exception.filter.js.map