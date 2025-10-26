import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ExceptionFilter,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcToHttpExceptionFilter implements ExceptionFilter { 
  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const error: any = exception.getError();

    const httpStatus =
      typeof error === 'object' && error.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      typeof error === 'object' ? error.message : error;
    response.status(httpStatus).json({
      statusCode: httpStatus,
      message: message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}