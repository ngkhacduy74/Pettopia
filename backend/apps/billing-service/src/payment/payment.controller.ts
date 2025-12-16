import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentService } from './payment.service.js';
import type { CreatePaymentDto } from './types/dto.js';
import { PaymentWebhookGuard } from './guards/payment-webhook.guard.js';

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @MessagePattern({ cmd: 'createPayment' })
  async createPayment(@Payload() body: CreatePaymentDto): Promise<any> {
    return this.paymentService.createPayment(body);
  }

  @MessagePattern({ cmd: 'handleWebhook' })
  @UseGuards(PaymentWebhookGuard)
  handleWebhook(@Payload() data: any) {
    return this.paymentService.handleWebhook(data);
  }

  @MessagePattern({ cmd: 'test' })
  async test(@Payload() data: any): Promise<any> {
    return { message: 'VietQR-payos service is running' };
  }
}
