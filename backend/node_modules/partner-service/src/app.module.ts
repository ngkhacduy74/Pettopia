import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    ]),
  ],
  controllers: [ClinicController],
  providers: [ClinicService, ClinicsRepository],
})
export class AppModule {}
