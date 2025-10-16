import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetController } from './controllers/pet.controller';
import { PetService } from './services/pet.service';
import { PetRepository } from './repositories/pet.repository';
import { Pet, PetSchema } from './schemas/pet.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IdentifyService } from './services/identification.service';
import { IdentificationRepository } from './repositories/identification.repositories';
import { Identification, IdentificationSchema } from './schemas/identification.schema';

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
    MongooseModule.forFeature([{ name: Pet.name, schema: PetSchema },{name:Identification.name,schema:IdentificationSchema  }]),
    ClientsModule.register([
      {
        name: 'CUSTOMER_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 5002,
        },
      },
    ]),
  ],
  controllers: [PetController],
  providers: [PetService, PetRepository,IdentifyService,IdentificationRepository],
})
export class AppModule {}
