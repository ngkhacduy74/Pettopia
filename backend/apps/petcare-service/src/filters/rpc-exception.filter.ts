import { Catch, RpcExceptionFilter, ArgumentsHost, Logger, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch()
export class GlobalRpcExceptionFilter implements RpcExceptionFilter {
  private readonly logger = new Logger(GlobalRpcExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): Observable<any> {
    const error: any = exception instanceof RpcException ? exception.getError() : exception;
    
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = null;
    let otherData: any = {};

    if (typeof error === 'object' && error !== null) {
        statusCode = error.statusCode || error.status || HttpStatus.INTERNAL_SERVER_ERROR;
        message = error.message || message;
        details = error.details || error.data || null;
        otherData = { ...error };
    } else if (typeof error === 'string') {
        message = error;
    }

    if (exception instanceof Error && !(exception instanceof RpcException)) {
        message = exception.message;
    }

    this.logger.error(`RPC Error: ${message}`, exception instanceof Error ? exception.stack : JSON.stringify(exception));

    return throwError(() => new RpcException({
        ...otherData,
        statusCode,
        message,
        details,
        timestamp: new Date().toISOString(),
    }));
  }
}
