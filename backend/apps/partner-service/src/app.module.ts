import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ClinicController } from './controllers/clinic/clinic.controller';
import { ClinicService } from './services/clinic/clinic.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  Clinic_Register,
  ClinicRegisterSchema,
} from './schemas/clinic/clinic-register.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicsRepository } from './repositories/clinic/clinic.repositories';
import { Clinic, ClinicSchema } from './schemas/clinic/clinic.schema';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { VetRepository } from './repositories/vet/vet.repositories';
import { VetService } from './services/vet/vet.service';
import {
  Vet_Register,
  VetRegisterSchema,
} from './schemas/vet/vet-register.schema';
import { Vet, VetSchema } from './schemas/vet/vet.schema';
import { VetController } from './controllers/vet/vet.controller';
import { ServiceRepository } from './repositories/clinic/service.repositories';
import { Service, ServiceSchema } from './schemas/clinic/service.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ShiftController } from './controllers/clinic/shift.controller';
import { ServiceController } from './controllers/clinic/service.controller';
import { ShiftRepository } from './repositories/clinic/shift.repositories';
import { ShiftService } from './services/clinic/shift.service';
import { ServiceService } from './services/clinic/service.service';
import {
  Shift,
  ShiftSchema,
} from './schemas/clinic/clinic_shift_setting.schema';
import { PrometheusController } from './controllers/prometheus.controller';
import { PrometheusService } from './services/prometheus.service';
import { PrometheusMiddleware } from './middleware/prometheus.middleware';
import {
  ClinicInvitation,
  ClinicInvitationSchema,
} from './schemas/clinic/clinic-invitation.schema';
import { ClinicInvitationRepository } from './repositories/clinic/clinic-invitation.repository';
import { ClinicInvitationController } from './controllers/clinic/invitation.controller';
import { ClinicInvitationService } from './services/clinic/clinic-invitation.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    ClientsModule.registerAsync([
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
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('PARTNER_DB_URI'),
      }),
    }),

    MongooseModule.forFeature([
      { name: Clinic_Register.name, schema: ClinicRegisterSchema },
      { name: Clinic.name, schema: ClinicSchema },
      { name: Vet_Register.name, schema: VetRegisterSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Vet.name, schema: VetSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: ClinicInvitation.name, schema: ClinicInvitationSchema },
    ]),
  ],
  controllers: [
    ClinicController,
    VetController,
    ShiftController,
    ServiceController,
    PrometheusController,
    ClinicInvitationController,
  ],
  providers: [
    ClinicService,
    ClinicsRepository,
    VetRepository,
    VetService,
    ServiceRepository,
    ShiftRepository,
    ShiftService,
    ServiceService,
    PrometheusService,
    ClinicInvitationRepository,
    ClinicInvitationService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        forbidUnknownValues: true,
      }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PrometheusMiddleware).forRoutes('*');
  }
}
