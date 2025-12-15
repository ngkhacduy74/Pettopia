import { Injectable, Inject } from '@nestjs/common';
import type { CreatePaymentDto } from './types/dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PayosRequestPaymentPayload } from './dto/payos-request-payment.payload';
import { generateSignature } from './payos-utils';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { ClientProxy } from '@nestjs/microservices';
import { PayosWebhookBodyPayload } from './dto/payos-webhook-body.payload';
import {
  getVipPackageByAmount,
  calculateVipExpiresAt,
} from './vip-packages.constants';

@Injectable()
export class PaymentService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @Inject('CUSTOMER_SERVICE')
    private readonly customerService: ClientProxy,
  ) {}

  async createPayment(body: CreatePaymentDto): Promise<any> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000); 
    const orderCode = parseInt(`${timestamp}${randomSuffix.toString().padStart(3, '0')}`);
    
    const orderId = body.orderId || orderCode.toString();    
    const url = `https://api-merchant.payos.vn/v2/payment-requests`;
    const config = {
      headers: {
        'x-client-id': this.configService.getOrThrow<string>('PAYOS_CLIENT_ID'),
        'x-api-key': this.configService.getOrThrow<string>('PAYOS_API_KEY'),
      },
    };
    const dataForSignature = {
      orderCode,
      amount: body.amount,
      description: body.description,
      cancelUrl: 'https://example.com/cancel',
      returnUrl: 'https://example.com/return',
    };
    const signature = generateSignature(
      dataForSignature,
      this.configService.getOrThrow<string>('PAYOS_CHECKSUM_KEY'),
    );
    const payload: PayosRequestPaymentPayload = {
      ...dataForSignature,
      signature,
    };
    const response = await firstValueFrom(
      this.httpService.post(url, payload, config),
    );

    
    const payment = new this.paymentModel({
      orderId,
      orderCode,
      userId: body.userId,
      amount: body.amount,
      description: body.description,
      paymentUrl: response.data?.checkoutUrl || null,
      status: 'pending',
      provider: 'payos',
      currency: 'VND',
    });
    await payment.save();

    return {
      ...response.data,
      userId: body.userId,
      orderId,
      orderCode,
    };
  }

  async handleWebhook(webhookData: PayosWebhookBodyPayload): Promise<any> {
    try {
      const { data, success } = webhookData;

      if (!success || !data) {
        console.error('Webhook failed or missing data:', webhookData);
        return { received: false, message: 'Invalid webhook data' };
      }

      const orderCode = data.orderCode;
      
      
      const payment = await this.paymentModel.findOne({ orderCode });

      if (!payment) {
        console.error(`Payment not found for orderCode: ${orderCode}`);
        return { received: false, message: 'Payment not found' };
      }

      
      if (payment.status !== 'pending') {
        console.log(`Payment ${orderCode} already processed with status: ${payment.status}`);
        return { received: true, message: 'Payment already processed' };
      }

      
      payment.status = 'succeeded';
      payment.paidAt = new Date(data.transactionDateTime || new Date());
      payment.metadata = {
        ...payment.metadata,
        transactionData: data,
      };
      await payment.save();

      try {
        const vipPackage = getVipPackageByAmount(payment.amount);
        
        if (!vipPackage) {
          console.error(
            `Invalid payment amount ${payment.amount} for user ${payment.userId}. No VIP package matched.`,
          );
          return {
            received: true,
            message: 'Payment processed but invalid amount for VIP package',
            orderCode,
            userId: payment.userId,
          };
        }

        const vipExpiresAt = calculateVipExpiresAt(vipPackage.months);
        await firstValueFrom(
          this.customerService.send(
            { cmd: 'updateUser' },
            {
              id: payment.userId,
              updateData: {
                is_vip: true,
                vip_expires_at: vipExpiresAt,
              },
            },
          ),
        );
        console.log(
          `User ${payment.userId} upgraded to VIP for ${vipPackage.months} months, expires at ${vipExpiresAt.toISOString()}`,
        );
      } catch (error) {
        console.error(
          `Failed to upgrade user ${payment.userId} to VIP:`,
          error,
        );
      }

      return {
        received: true,
        message: 'Payment processed successfully and user upgraded to VIP',
        orderCode,
        userId: payment.userId,
      };
    } catch (error) {
      console.error('Error handling webhook:', error);
      return { received: false, error: error.message };
    }
  }
}
