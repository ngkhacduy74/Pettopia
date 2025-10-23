import { RpcException } from '@nestjs/microservices';

export function handleRpcError(context: string, err: any): never {
  if (err instanceof RpcException) {
    throw err;
  }
  throw new RpcException({
    message: err?.message || 'Lỗi không xác định trong microservice',
    context,
    code: err?.code || null,
    timestamp: new Date().toISOString(),
  });
}
