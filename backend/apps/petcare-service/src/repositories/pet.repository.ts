import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pet, PetDocument } from '../schemas/pet.schema';
import { CreatePetDto } from '../dto/pet/create-pet.dto';
import { UpdatePetDto } from '../dto/pet/update-pet.dto';

@Injectable()
export class PetRepository {
  constructor(
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
  ) {}

  async create(createPetDto: CreatePetDto): Promise<Pet> {
    const createdPet = new this.petModel(createPetDto);
    return createdPet.save();
  }

  async findAll(): Promise<Pet[]> {
    return this.petModel.find().exec();
  }

  async findById(pet_id: string): Promise<Pet | null> {
    return this.petModel.findOne({ pet_id }).exec();
  }

  async update(pet_id: string, updatePetDto: UpdatePetDto): Promise<Pet | null> {
    return this.petModel
      .findOneAndUpdate({ pet_id }, updatePetDto, { new: true })
      .exec();
  }

  async delete(pet_id: string): Promise<Pet | null> {
    return this.petModel.findOneAndDelete({ pet_id }).exec();
  }

  async findBySpecies(species: string): Promise<Pet[]> {
    return this.petModel.find({ species }).exec();
  }

  async count(): Promise<number> {
    return this.petModel.countDocuments().exec();
  }
}
