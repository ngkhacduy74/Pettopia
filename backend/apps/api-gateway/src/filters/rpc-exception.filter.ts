import {
  Catch,
  ArgumentsHost,
  HttpStatus,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcToHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('RpcExceptionFilter');

  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const error = exception.getError();
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = null;

    try {
      if (typeof error === 'object' && error !== null) {
        const err = error as any;

        // Priority 1: Direct properties
        statusCode = err.statusCode || err.status || err.code || HttpStatus.INTERNAL_SERVER_ERROR;
        message = err.message || err.error || err.msg || message;

        // Extract details
        if (err.details || err.data || err.errorDetails) {
          details = err.details || err.data || err.errorDetails;
        }

        // Priority 2: Nested error object
        if (err.error && typeof err.error === 'object') {
          const nestedError = err.error as any;
          statusCode = nestedError.statusCode || nestedError.status || statusCode;
          message = nestedError.message || message;
          if (nestedError.details) details = nestedError.details;
        }
      } else if (typeof error === 'string') {
        try {
          const parsed = JSON.parse(error);
          statusCode = parsed.statusCode || parsed.status || HttpStatus.INTERNAL_SERVER_ERROR;
          message = parsed.message || error;
          details = parsed.details || parsed.error || parsed.data;
        } catch {
          message = error;
        }
      } else if (typeof error === 'number') {
        statusCode = error;
      }
    } catch (err) {
      this.logger.error('Error processing RPC exception:', err);
    }

    // Ensure legitimate HTTP status code
    if (typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    this.logger.error(
      `[RPC Error] ${request.method} ${request.url} -> Status: ${statusCode}, Message: ${message}`,
      JSON.stringify(details || error),
    );

    // Clean response
    const responseBody: any = {
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
}
