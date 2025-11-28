import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ExceptionFilter,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost): Observable<any> {

    if (exception instanceof RpcException) {
      return throwError(() => exception);
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();
      
      const errorObj = typeof response === 'string' 
        ? { message: response }
        : response;

      return throwError(() => new RpcException({
        statusCode: status,
        message: (errorObj as any).message || exception.message || 'Validation failed',
        error: (errorObj as any).error || 'Bad Request',
        ...(typeof errorObj === 'object' && !Array.isArray(errorObj) 
          ? errorObj 
          : { details: errorObj }),
        timestamp: new Date().toISOString(),
      }));
    }


    console.error('Unhandled exception in microservice:', exception);
    
    return throwError(() => new RpcException({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: exception?.message || 'Internal server error',
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && exception?.stack 
        ? { stack: exception.stack } 
        : {}),
    }));
  }
}

