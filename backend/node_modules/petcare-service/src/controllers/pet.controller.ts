import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { PetService } from '../services/pet.service';
import { CreatePetDto } from '../dto/pet/create-pet.dto';
// import { UpdatePetDto } from '../dto/pet/update-pet.dto';
import { PetResponseDto } from '../dto/pet/pet-response.dto';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class PetController {
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
    console.log('dataPetService', data);
    return this.petService.create(data);
  }
  // @Get()
  // async findAll(): Promise<PetResponseDto[]> {
  //   return this.petService.findAll();
  // }

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

  // @Get(':pet_id')
  // async findById(@Param('pet_id') pet_id: string): Promise<PetResponseDto> {
  //   return this.petService.findById(pet_id);
  // }

  // @Patch(':pet_id')
  // async update(
  //   @Param('pet_id') pet_id: string,
  //   @Body() updatePetDto: UpdatePetDto,
  // ): Promise<PetResponseDto> {
  //   return this.petService.update(pet_id, updatePetDto);
  // }

  // @Delete(':pet_id')
  // @HttpCode(HttpStatus.OK)
  // async delete(@Param('pet_id') pet_id: string): Promise<{ message: string }> {
  //   return this.petService.delete(pet_id);
  // }
}
