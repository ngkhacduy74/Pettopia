import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { CustomerController } from './controllers/customer.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { PetController } from './controllers/petcare.controller';
import { PartnerController } from './controllers/partner.controller';
import { AiController } from './controllers/ai.controller';
import { CommunicationController } from './controllers/communication.controller';
import { HealthcareController } from './controllers/healthcare.controller';
import { PaymentController } from './controllers/payment.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RMQ_URL',
                'amqp://guest:guest@rabbitmq:5672',
              ),
            ],
            queue: 'auth_service_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'CUSTOMER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RMQ_URL',
                'amqp://guest:guest@rabbitmq:5672',
              ),
            ],
            queue: 'customer_service_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'PETCARE_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RMQ_URL',
                'amqp://guest:guest@rabbitmq:5672',
              ),
            ],
            queue: 'petcare_service_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'PARTNER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RMQ_URL',
                'amqp://guest:guest@rabbitmq:5672',
              ),
            ],
            queue: 'partner_service_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'HEALTHCARE_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RMQ_URL',
                'amqp://guest:guest@rabbitmq:5672',
              ),
            ],
            queue: 'healthcare_service_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'COMMUNICATION_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RMQ_URL',
                'amqp://guest:guest@rabbitmq:5672',
              ),
            ],
            queue: 'communication_service_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'BILLING_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RMQ_URL',
                'amqp://guest:guest@rabbitmq:5672',
              ),
            ],
            queue: 'billing_service_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [
    AuthController,
    CustomerController,
    PetController,
    PartnerController,
    PaymentController,
    AiController,
    CommunicationController,
    HealthcareController,
  ],
  providers: [AppService],
})
export class AppModule {}
