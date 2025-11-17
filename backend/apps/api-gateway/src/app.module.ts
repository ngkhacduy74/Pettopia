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
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.NODE_ENV === 'production'
              ? 'auth-service'
              : 'localhost',
          port: parseInt(process.env.TCP_AUTH_PORT ?? '5001', 10),
        },
      },
      {
        name: 'CUSTOMER_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.NODE_ENV === 'production'
              ? 'customer-service'
              : 'localhost',
          port: parseInt(process.env.TCP_CUSTOMER_PORT ?? '5002', 10),
        },
      },
      {
        name: 'PETCARE_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.NODE_ENV === 'production'
              ? 'petcare-service'
              : 'localhost',
          port: parseInt(process.env.TCP_PET_PORT ?? '5003', 10),
        },
      },
      {
        name: 'PARTNER_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.NODE_ENV === 'production'
              ? 'partner-service'
              : 'localhost',
          port: parseInt(process.env.TCP_PARTNER_PORT ?? '5004', 10),
        },
      },
      {
        name: 'HEALTHCARE_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.NODE_ENV === 'production'
              ? 'healthcare-service'
              : 'localhost',
          port: parseInt(process.env.TCP_HEALTHCARE_PORT ?? '5005', 10),
        },
      },
      {
        name: 'COMMUNICATION_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.NODE_ENV === 'production'
              ? 'communication-service'
              : 'localhost',
          port: parseInt(process.env.TCP_COMMUNICATION_PORT ?? '5006', 10),
        },
      },
      {
        name: 'BILLING_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.NODE_ENV === 'production'
              ? 'billing-service'
              : 'localhost',
          port: parseInt(process.env.TCP_BILLING_PORT ?? '5007', 10),
        },
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
