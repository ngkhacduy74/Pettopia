import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { AppointmentController } from './controllers/appointment.controller';
import { AppointmentService } from './services/appointment.service';
import { AppointmentRepository } from './repositories/appointment.repositories';
import { RatingRepository } from './repositories/rating.repositories';
import { Appointment, AppointmentSchema } from './schemas/appoinment.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  MedicalRecord,
  MedicalRecordSchema,
} from './schemas/medical_record.schema';
import { Medication, MedicationSchema } from './schemas/preciption.schema';
import { Vet_Schedule, VetScheduleSchema } from './schemas/vet_schedule.schema';
import {
  ClinicRating,
  ClinicRatingSchema,
} from './schemas/rating.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrometheusMiddleware } from './middleware/prometheus.middleware';
import { PrometheusController } from './controllers/prometheus.controller';
import { PrometheusService } from './services/prometheus.service';

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
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('CUSTOMER_HOST') || 'customer-service',
            port: configService.get<number>('TCP_CUSTOMER_PORT') || 5002,
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
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('HEALTHCARE_DB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: MedicalRecord.name, schema: MedicalRecordSchema },
      { name: Medication.name, schema: MedicationSchema },
      { name: Vet_Schedule.name, schema: VetScheduleSchema },
      { name: ClinicRating.name, schema: ClinicRatingSchema },
    ]),
  ],
  controllers: [AppointmentController, PrometheusController],
  providers: [
    AppointmentService,
    AppointmentRepository,
    RatingRepository,
    PrometheusService,
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
