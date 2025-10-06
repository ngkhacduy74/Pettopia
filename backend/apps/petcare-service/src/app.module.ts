import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetController } from './controllers/pet.controller';
import { PetService } from './services/pet.service';
import { PetRepository } from './repositories/pet.repository';
import { Pet, PetSchema } from './schemas/pet.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb+srv://khacduy0704:khacduy0704@cluster0.5rfakrg.mongodb.net/db_petcare',
      {
        connectionName: 'petcare',
      }
    ),
    MongooseModule.forFeature(
      [{ name: Pet.name, schema: PetSchema }],
      'petcare'
    ),
  ],
  controllers: [PetController],
  providers: [PetService, PetRepository],
})
export class AppModule {}
