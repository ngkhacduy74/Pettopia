import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { CustomerController } from './controllers/customer.controller';
import { AppointmentsController } from './controllers/appointments.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { PetController } from './controllers/petcare.controller';
import { PartnerController } from './controllers/partner.controller';
import { CommunicationController } from './controllers/communication.controller';

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
          port: 5001,
        },
      },
      {
        name: 'CUSTOMER_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 5002,
        },
      },
      {
        name: 'PETCARE_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 5003,
        },
      },
      {
        name: 'PARTNER_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 5004,
        },
      },
      {
        name: 'HEALTHCARE_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 5005,
        },
      },
      {
        name: 'COMMUNICATION_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 5006,
        },
      },
      {
        name: 'BILLING_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 5007,
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
    AppointmentsController,
    PartnerController,
    CommunicationController
  ],
  providers: [AppService],
})
export class AppModule {}
