import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { CustomerController } from './controllers/customer.controller';
import { AppointmentsController } from './controllers/appointments.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { PetController } from './controllers/petcare.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClientsModule.register([
      {
        name: 'CUSTOMER_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 5002,
        },
      },
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 5001,
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
        name: 'PETCARE_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 5003,
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
  controllers: [AuthController, CustomerController, PetController, AppointmentsController],
  providers: [AppService],
})
export class AppModule {}
