import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppointmentsRepository } from './repositories/appointments.repositories'; // 👈 thêm dòng này

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('HEALTHCARE_DB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    ClientsModule.register([
      {
        name: 'CUSTOMER_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 5002,
        },
      },
    ])
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository], // 👈 thêm repository vào đây
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
