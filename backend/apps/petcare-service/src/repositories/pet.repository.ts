import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pet, PetDocument } from '../schemas/pet.schema';
import { CreatePetDto } from '../dto/pet/create-pet.dto';
// import { UpdatePetDto } from '../dto/pet/update-pet.dto';
import { GetAllPetsDto } from '../dto/pet/get-all-pets.dto';
import { PaginatedPetsResponse } from '../dto/pet/paginated-pets-response.dto';

@Injectable()
export class PetRepository {
  constructor(@InjectModel(Pet.name) private petModel: Model<PetDocument>) {}

  async create(petDataToSave: CreatePetDto | any): Promise<Pet> {
    try {
      const pet = await this.petModel.create(petDataToSave);

      if (!pet) {
        throw new InternalServerErrorException('Không thể tạo pet trong DB');
      }
      return pet;
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi khi lưu Pet vào cơ sở dữ liệu: ' + error.message,
      );
    }
  }

  async findAll(): Promise<Pet[]> {
    return this.petModel.find().exec();
  }

  async getAllPets(data: GetAllPetsDto): Promise<PaginatedPetsResponse<Pet>> {
    try {
      const { page, limit, search, species, gender, sort_field, sort_order } =
        data;

      const safePage = Math.max(Number(page) || 1, 1);
      const safeLimit = Math.max(Number(limit) || 15, 1);
      const skip = (safePage - 1) * safeLimit;
      const filter: any = {};

      if (search) {
        const regex = new RegExp(search, 'i');
        filter.$or = [{ name: regex }, { species: regex }, { color: regex }];
      }

      if (species) {
        filter.species = species;
      }

      if (gender) {
        filter.gender = gender;
      }

      const sort: any = {};
      if (sort_field) {
        sort[sort_field] = sort_order === 'asc' ? 1 : -1;
      } else {
        sort['createdAt'] = -1;
      }

      const [items, total] = await Promise.all([
        this.petModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(safeLimit)
          .exec(),
        this.petModel.countDocuments(filter).exec(),
      ]);

      return {
        items,
        total,
        page: safePage,
        limit: safeLimit,
      };
    } catch (err) {
      throw new Error(err);
    }
  }

  async findById(pet_id: string): Promise<Pet | null> {
    return this.petModel.findOne({ id: pet_id }).exec();
  }

  // async update(
  //   pet_id: string,
  //   updatePetDto: UpdatePetDto,
  // ): Promise<Pet | null> {
  //   return this.petModel
  //     .findOneAndUpdate({ pet_id }, updatePetDto, { new: true })
  //     .exec();
  // }

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
