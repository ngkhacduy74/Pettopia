import { RpcException } from '@nestjs/microservices';

export function handleRpcError(context: string, error: any): never {
  if (error instanceof RpcException) {
    throw error;
  }
  
  // Nếu error là một đối tượng lỗi HTTP từ NestJS
  if (error?.response) {
    throw new RpcException({
      ...error.response,
      statusCode: error.status || 500,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  // Nếu error là một đối tượng lỗi thông thường
  if (error instanceof Error) {
    throw new RpcException({
      statusCode: error['statusCode'] || 500,
      message: error.message || 'Lỗi không xác định trong microservice',
      error: error.name || 'Internal Server Error',
      context,
      code: error['code'] || 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }

  // Xử lý trường hợp error là string hoặc không xác định
  throw new RpcException({
    statusCode: 500,
    message: typeof error === 'string' ? error : 'Lỗi không xác định trong microservice',
    error: 'Internal Server Error',
    context,
    timestamp: new Date().toISOString(),
  });
}
