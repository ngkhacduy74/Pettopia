import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PetService } from '../services/pet.service';
import { CreatePetDto } from '../dto/pet/create-pet.dto';
import { UpdatePetDto } from '../dto/pet/update-pet.dto';
import { PetResponseDto } from '../dto/pet/pet-response.dto';
import { GetAllPetsDto } from '../dto/pet/get-all-pets.dto';
import { GetPetByIdDto } from '../dto/pet/get-pet-by-id.dto';

@Controller()
export class PetController {
  private readonly logger = new Logger(PetController.name);

  constructor(private readonly petService: PetService) {}

  // @Post(':userId')
  // @HttpCode(HttpStatus.CREATED)
  // async create(
  //   @Param('userId') userId: string,
  //   @Body() createPetDto: CreatePetDto,
  // ): Promise<PetResponseDto> {
  //   return this.petService.create(userId, createPetDto);
  // }

  @MessagePattern({ cmd: 'createPet' })
  async createPet(data: CreatePetDto): Promise<PetResponseDto> {
    try {
      this.logger.log(`Received createPet: ${JSON.stringify(data)}`);
      return await this.petService.create(data);
    } catch (error) {
      this.logger.error('Error creating pet:', error);
      return { message: 'Failed to create pet', error: error.message } as any;
    }
  }

  @MessagePattern({ cmd: 'getAllPets' })
  async getAllPets(data: GetAllPetsDto): Promise<PetResponseDto[]> {
    try {
      return await this.petService.findAll();
    } catch (error) {
      this.logger.error('Error fetching all pets:', error);
      return [{ message: 'Failed to fetch pets', error: error.message }] as any;
    }
  }

  // @Get()
  // async findAll(): Promise<PetResponseDto[]> {
  //   return this.petService.findAll();
  // }

  @MessagePattern({ cmd: 'getPetCount' })
  async getPetCount(): Promise<{ count: number }> {
    try {
      return await this.petService.getPetCount();
    } catch (error) {
      this.logger.error('Error getting pet count:', error);
      return { count: 0, error: error.message } as any;
    }
  }

  // @Get('count')
  // async getPetCount(): Promise<{ count: number }> {
  //   return this.petService.getPetCount();
  // }

  // @Get('species/:species')
  // async findBySpecies(
  //   @Param('species') species: string,
  // ): Promise<PetResponseDto[]> {
  //   return this.petService.findBySpecies(species);
  // }
  @MessagePattern({ cmd: 'getPetById' })
  async getPetById(data: GetPetByIdDto): Promise<PetResponseDto> {
    try {
      return await this.petService.findById(data.pet_id);
    } catch (error) {
      this.logger.error('Error fetching pet by ID:', error);
      return { message: 'Failed to fetch pet', error: error.message } as any;
    }
  }

  // @Get(':pet_id')
  // async findById(@Param('pet_id') pet_id: string): Promise<PetResponseDto> {
  //   return this.petService.findById(pet_id);
  // }
  @MessagePattern({ cmd: 'getPetsByOwner' })
  async getPetsByOwner(data: { user_id: string }): Promise<PetResponseDto[]> {
    try {
      return await this.petService.findByOwnerId(data.user_id);
    } catch (error) {
      this.logger.error('Error fetching pets by owner:', error);
      return [
        { message: 'Failed to fetch pets by owner', error: error.message },
      ] as any;
    }
  }
  // @Patch(':pet_id')
  // async update(
  //   @Param('pet_id') pet_id: string,
  //   @Body() updatePetDto: UpdatePetDto,
  // ): Promise<PetResponseDto> {
  //   return this.petService.update(pet_id, updatePetDto);
  @MessagePattern({ cmd: 'updatePet' })
  async updatePet(data: {
    pet_id: string;
    updateData: UpdatePetDto;
    fileBuffer?: string;
  }): Promise<any> {
    try {
      this.logger.log(`Received updatePet for ${data.pet_id}`);
      return await this.petService.update(data);
    } catch (error) {
      this.logger.error('Error updating pet:', error);
      return { message: 'Failed to update pet', error: error.message } as any;
    }
  }
  // }
  // @Delete(':pet_id')
  // @HttpCode(HttpStatus.OK)
  // async delete(@Param('pet_id') pet_id: string): Promise<{ message: string }> {
  //   return this.petService.delete(pet_id);
  // }
  @MessagePattern({ cmd: 'deletePet' })
  async deletePet(data: GetPetByIdDto): Promise<{ message: string }> {
    try {
      return await this.petService.delete(data.pet_id);
    } catch (error) {
      this.logger.error('Error deleting pet:', error);
      return { message: 'Failed to delete pet', error: error.message } as any;
    }
  }
}
