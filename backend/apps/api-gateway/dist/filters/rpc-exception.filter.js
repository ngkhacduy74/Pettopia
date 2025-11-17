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
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const error = exception.getError();
        let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let errorDetails = null;
        console.log('RPC Error:', error);
        try {
            if (error && typeof error === 'object') {
                const errorObj = error;
                const nestedError = errorObj.error || errorObj;
                statusCode = nestedError.statusCode || nestedError.status || statusCode;
                message = nestedError.message || message;
                errorDetails = { ...errorObj };
                const fieldsToRemove = ['statusCode', 'status', 'message', 'error'];
                fieldsToRemove.forEach(field => {
                    if (field in errorDetails) {
                        delete errorDetails[field];
                    }
                });
                if (Object.keys(errorDetails).length === 0) {
                    errorDetails = null;
                }
            }
            else if (typeof error === 'string') {
                try {
                    const parsedError = JSON.parse(error);
                    statusCode = parsedError.statusCode || statusCode;
                    message = parsedError.message || message;
                    errorDetails = parsedError.error || null;
                }
                catch (e) {
                    message = error;
                }
            }
        }
        catch (err) {
            console.error('Error processing RPC exception:', err);
        }
        const responseBody = {
            statusCode,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        if (errorDetails) {
            responseBody.error = errorDetails;
        }
        return response.status(statusCode).json(responseBody);
    }
};
exports.RpcToHttpExceptionFilter = RpcToHttpExceptionFilter;
exports.RpcToHttpExceptionFilter = RpcToHttpExceptionFilter = __decorate([
    (0, common_1.Catch)(microservices_1.RpcException)
], RpcToHttpExceptionFilter);
//# sourceMappingURL=rpc-exception.filter.js.map