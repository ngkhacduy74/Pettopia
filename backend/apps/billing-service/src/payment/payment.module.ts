import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema.js';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    ClientsModule.registerAsync([
      {
        name: 'CUSTOMER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('CUSTOMER_HOST') || 'customer-service',
            port: configService.get<number>('TCP_CUSTOMER_PORT') || 5002,
          },
        }),
      },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule { }
