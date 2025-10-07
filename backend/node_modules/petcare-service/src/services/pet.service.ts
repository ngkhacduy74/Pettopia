import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PetRepository } from '../repositories/pet.repository';
import { CreatePetDto } from '../dto/pet/create-pet.dto';
// import { UpdatePetDto } from '../dto/pet/update-pet.dto';
import { PetResponseDto } from '../dto/pet/pet-response.dto';
import { Pet } from '../schemas/pet.schema';
import { v4 as uuidv4 } from 'uuid';
import { lastValueFrom } from 'rxjs';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { mapToResponseDto } from '../dto/response/pet.response';
@Injectable()
export class PetService {
  constructor(
    private readonly petRepository: PetRepository,
    @Inject('CUSTOMER_SERVICE') private customerClient: ClientProxy,
  ) {}

  async create(data: CreatePetDto): Promise<PetResponseDto | any> {
    try {
      const user = await lastValueFrom(
        this.customerClient.send({ cmd: 'getUserById' }, { id: data.user_id }),
      );
      
      if (!user) {
        throw new RpcException('User not found');
      }
      const ownerData = {
        user_id: user.id,
        fullname: user.fullname,
        phone: user.phone.phone_number,
        email: user.email.email_address,
      };
      const petData = {
        id: uuidv4(),
        ...data,
        owner: ownerData,
        dateOfBirth: new Date(data.dateOfBirth),
      };
      const pet = await this.petRepository.create(petData);
      if (!pet) {
        throw new BadRequestException('Failed to create pet');
      }
      console.log('pet', pet);
      return pet;
    } catch (error) {
      throw new BadRequestException('Failed to create pet: ' + error.message);
    }
  }

  async findAll(): Promise<PetResponseDto[]> {
    try {
      const pets = await this.petRepository.findAll();
      return pets.map((pet) => mapToResponseDto(pet));
    } catch (error) {
      throw new BadRequestException('Failed to fetch pets: ' + error.message);
    }
  }

  async findById(pet_id: string): Promise<PetResponseDto> {
    try {
      const pet = await this.petRepository.findById(pet_id);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${pet_id} not found`);
      }
      return mapToResponseDto(pet);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch pet: ' + error.message);
    }
  }

  // async update(pet_id: string, updatePetDto: UpdatePetDto): Promise<PetResponseDto> {
  //   try {
  //     const updateData = { ...updatePetDto };
  //     if (updatePetDto.dateOfBirth) {
  //       updateData.dateOfBirth = new Date(updatePetDto.dateOfBirth);
  //     }

  //     const pet = await this.petRepository.update(pet_id, updateData);
  //     if (!pet) {
  //       throw new NotFoundException(`Pet with ID ${pet_id} not found`);
  //     }
  //     return this.mapToResponseDto(pet);
  //   } catch (error) {
  //     if (error instanceof NotFoundException) {
  //       throw error;
  //     }
  //     throw new BadRequestException('Failed to update pet: ' + error.message);
  //   }
  // }

  async delete(pet_id: string): Promise<{ message: string }> {
    try {
      const pet = await this.petRepository.delete(pet_id);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${pet_id} not found`);
      }
      return { message: 'Pet deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete pet: ' + error.message);
    }
  }

  async findBySpecies(species: string): Promise<PetResponseDto[]> {
    try {
      const pets = await this.petRepository.findBySpecies(species);
      return pets.map((pet) => mapToResponseDto(pet));
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch pets by species: ' + error.message,
      );
    }
  }

  async getPetCount(): Promise<{ count: number }> {
    try {
      const count = await this.petRepository.count();
      return { count };
    } catch (error) {
      throw new BadRequestException(
        'Failed to get pet count: ' + error.message,
      );
    }
  }
}
