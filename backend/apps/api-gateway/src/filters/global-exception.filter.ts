import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('GlobalExceptionFilter');

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let details: any = null;

        if (exception instanceof HttpException) {
            statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                const response = exceptionResponse as any;
                message = response.message || response.error || message;
                details = response.details || null;
            }
        } else if (exception instanceof Error) {
            message = exception.message;

            // Log full stack in development
            if (process.env.NODE_ENV === 'development') {
                details = {
                    stack: exception.stack,
                    name: exception.name,
                };
            }
        }

        // Log error with context
        this.logger.error(
            `[${statusCode}] ${request.method} ${request.url} - ${message}`,
            exception instanceof Error ? exception.stack : undefined,
        );

        // Build response
        const responseBody: any = {
            statusCode,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        };

        if (details) {
            responseBody.details = details;
        }

        // Always log stack trace for non-validation errors to help debugging
        if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR && exception instanceof Error) {
            this.logger.error(`[Global Error] ${request.method} ${request.url}`, exception.stack);
        } else {
            this.logger.error(`[Global Error] ${request.method} ${request.url} - ${statusCode}: ${message}`);
        }

        return response.status(statusCode).json(responseBody);
    }
}
