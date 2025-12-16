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
import { UserToken } from 'src/decorators/user.decorator';

@Controller('api/v1/payments')
export class PaymentController {
  constructor(
    @Inject('BILLING_SERVICE')
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
  async createPayment(
    @Body() data: any,
    @UserToken('id') userId: string,
  ) {
    return await lastValueFrom(
      this.paymentService.send(
        { cmd: 'createPayment' },
        { ...data, userId },
      ),
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
