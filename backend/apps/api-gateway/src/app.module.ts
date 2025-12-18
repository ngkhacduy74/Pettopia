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
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate Limiting Configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('AUTH_HOST') || 'auth-service',
            port: configService.get<number>('TCP_AUTH_PORT') || 5001,
          },
        }),
      },
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
      {
        name: 'PETCARE_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('PETCARE_HOST') || 'petcare-service',
            port: configService.get<number>('TCP_PETCARE_PORT') || 5003,
          },
        }),
      },
      {
        name: 'PARTNER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('PARTNER_HOST') || 'partner-service',
            port: configService.get<number>('TCP_PARTNER_PORT') || 5004,
          },
        }),
      },
      {
        name: 'HEALTHCARE_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('HEALTHCARE_HOST') || 'healthcare-service',
            port: configService.get<number>('TCP_HEALTHCARE_PORT') || 5005,
          },
        }),
      },
      {
        name: 'COMMUNICATION_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('COMMUNICATION_HOST') || 'communication-service',
            port: configService.get<number>('TCP_COMMUNICATION_PORT') || 5006,
          },
        }),
      },
      {
        name: 'BILLING_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('BILLING_HOST') || 'billing-service',
            port: configService.get<number>('TCP_BILLING_PORT') || 5007,
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
  providers: [
    AppService,
    // Apply Rate Limiting Guard Globally
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
})
export class AppModule { }
