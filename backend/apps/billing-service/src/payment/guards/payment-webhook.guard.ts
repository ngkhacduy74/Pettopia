import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayosWebhookBodyPayload } from '../dto/payos-webhook-body.payload';
import { createHmac } from 'node:crypto';
import { convertObjToQueryStr, sortObjDataByKey } from '../payos-utils';

@Injectable()
export class PaymentWebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  isValidData(
    data: Record<string, unknown>,
    currentSignature: string,
    checksumKey: string,
  ) {
    const sortedDataByKey = sortObjDataByKey(data);
    const dataQueryStr = convertObjToQueryStr(sortedDataByKey);
    const dataToSignature = createHmac('sha256', checksumKey)
      .update(dataQueryStr)
      .digest('hex');
    return dataToSignature == currentSignature;
  }

  canActivate(context: ExecutionContext): boolean {
    try {
      const CHECKSUM_KEY =
        this.configService.getOrThrow<string>('PAYOS_CHECKSUM_KEY');

      // Hỗ trợ cả HTTP webhook trực tiếp và RPC từ api-gateway
      let body: PayosWebhookBodyPayload | undefined;

      const contextType = context.getType();

      if (contextType === 'http') {
        const req = context.switchToHttp().getRequest<Request>();
        body = req.body as unknown as PayosWebhookBodyPayload;
      } else if (contextType === 'rpc') {
        body = context.switchToRpc().getData() as PayosWebhookBodyPayload;
      }

      
      if (!body || typeof body !== 'object') {
        console.error('Invalid webhook payload: body is not an object', { body });
        throw new UnauthorizedException('Invalid payload structure');
      }

      if (!body.data || typeof body.data !== 'object') {
        console.error('Invalid webhook payload: missing or invalid data field', { body });
        throw new UnauthorizedException('Invalid payload: missing data field');
      }

      if (!body.signature || typeof body.signature !== 'string') {
        console.error('Invalid webhook payload: missing or invalid signature', { body });
        throw new UnauthorizedException('Invalid payload: missing signature');
      }

      const isValidPayload = this.isValidData(
        body.data as unknown as Record<string, unknown>,
        body.signature,
        CHECKSUM_KEY,
      );
      
      console.log({ CHECKSUM_KEY, isValidPayload, body });
      
      if (!isValidPayload) {
        throw new UnauthorizedException('Invalid payload signature');
      }

      return true;
    } catch (error) {
      console.error('PaymentWebhookGuard error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid payload');
    }
  }
}
