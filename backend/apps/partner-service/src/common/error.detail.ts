import { RpcException } from '@nestjs/microservices';

export function handleRpcError(context: string, err: any): never {
  if (err instanceof RpcException) {
    throw err;
  }
  throw new RpcException({
    statusCode: 500,
    message: err?.message || 'Lỗi không xác định trong microservice',
    context,
    code: err?.code || null,
    timestamp: new Date().toISOString(),
  });
}
export function createRpcError(
  statusCode: number,
  message: string,
  error: string,
  details?: any,
): RpcException {
  return new RpcException({
    statusCode,
    message,
    error,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  });
}
