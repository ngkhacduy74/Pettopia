import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { JwtAuthGuard } from 'src/guard/jwtAuth.guard';

@Controller('api/v1/payments')
export class PaymentController {
  constructor(
    @Inject('PAYMENT_SERVICE')
    private readonly paymentService: ClientProxy,
  ) {}

  @Get('/test')
  @HttpCode(HttpStatus.OK)
  async test() {
    return await lastValueFrom(this.paymentService.send({ cmd: 'test' }, {}));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createPayment(@Body() data: any) {
    return await lastValueFrom(
      this.paymentService.send({ cmd: 'createPayment' }, data),
    );
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() data: any) {
    return await lastValueFrom(
      this.paymentService.send({ cmd: 'handleWebhook' }, data),
    );
  }
}
