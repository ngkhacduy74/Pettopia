import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PetRepository } from '../repositories/pet.repository';
import { CreatePetDto } from '../dto/pet/create-pet.dto';
import { UpdatePetDto } from '../dto/pet/update-pet.dto';
import { PetResponseDto } from '../dto/pet/pet-response.dto';
import { Pet } from '../schemas/pet.schema';

@Injectable()
export class PetService {
  constructor(private readonly petRepository: PetRepository) {}

  async create(userId: string, createPetDto: CreatePetDto): Promise<PetResponseDto> {
    try {
      
      const petData = {
        ...createPetDto,
        userId,
        dateOfBirth: new Date(createPetDto.dateOfBirth),
      };

      const pet = await this.petRepository.create(petData);
      return this.mapToResponseDto(pet);
    } catch (error) {
      throw new BadRequestException('Failed to create pet: ' + error.message);
    }
  }

  async findAll(): Promise<PetResponseDto[]> {
    try {
      const pets = await this.petRepository.findAll();
      return pets.map(pet => this.mapToResponseDto(pet));
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
      return this.mapToResponseDto(pet);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch pet: ' + error.message);
    }
  }

  async update(pet_id: string, updatePetDto: UpdatePetDto): Promise<PetResponseDto> {
    try {
      const updateData = { ...updatePetDto };
      if (updatePetDto.dateOfBirth) {
        updateData.dateOfBirth = new Date(updatePetDto.dateOfBirth);
      }

      const pet = await this.petRepository.update(pet_id, updateData);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${pet_id} not found`);
      }
      return this.mapToResponseDto(pet);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update pet: ' + error.message);
    }
  }

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
      return pets.map(pet => this.mapToResponseDto(pet));
    } catch (error) {
      throw new BadRequestException('Failed to fetch pets by species: ' + error.message);
    }
  }

  async getPetCount(): Promise<{ count: number }> {
    try {
      const count = await this.petRepository.count();
      return { count };
    } catch (error) {
      throw new BadRequestException('Failed to get pet count: ' + error.message);
    }
  }

  private mapToResponseDto(pet: Pet): PetResponseDto {
    return {
      pet_id: pet.pet_id,
      name: pet.name,
      species: pet.species,
      gender: pet.gender,
      age: pet.age,
      color: pet.color,
      weight: pet.weight,
      dateOfBirth: pet.dateOfBirth,
      userId: pet.userId,
    };
  }
}
