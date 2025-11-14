import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetController } from './controllers/pet.controller';
import { PetService } from './services/pet.service';
import { PetRepository } from './repositories/pet.repository';
import { Pet, PetSchema } from './schemas/pet.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IdentifyService } from './services/identification.service';
import { IdentificationRepository } from './repositories/identification.repositories';
import {
  Identification,
  IdentificationSchema,
} from './schemas/identification.schema';
import { PrometheusController } from './controllers/prometheus.controller';
import { PrometheusService } from './services/prometheus.service';
import { PrometheusMiddleware } from './middleware/prometheus.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('PET_DB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: Pet.name, schema: PetSchema },
      { name: Identification.name, schema: IdentificationSchema },
    ]),
    ClientsModule.register([
      {
        name: 'CUSTOMER_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.NODE_ENV === 'production'
              ? 'customer-service'
              : 'localhost',
          port: 5002,
        },
      },
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.NODE_ENV === 'production'
              ? 'auth-service'
              : 'localhost',
          port: 5001,
        },
      },
    ]),
  ],
  controllers: [PetController, PrometheusController],
  providers: [
    PetService,
    PetRepository,
    IdentifyService,
    IdentificationRepository,
    PrometheusService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PrometheusMiddleware).forRoutes('*');
  }
}
