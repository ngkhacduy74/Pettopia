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
  async update(pet_id: string, updateData: any): Promise<Pet> {
  try {
    const updatedPet = await this.petModel
      .findOneAndUpdate({ id: pet_id }, updateData, {
        new: true, // trả về document sau khi update
        runValidators: true, // bật validation
      })
      .exec();

    if (!updatedPet) {
      throw new InternalServerErrorException(
        `Không tìm thấy thú cưng với ID: ${pet_id}`,
      );
    }

    return updatedPet;
  } catch (error) {
    throw new InternalServerErrorException(
      'Lỗi khi cập nhật Pet: ' + error.message,
    );
  }
}

  async delete(pet_id: string): Promise<Pet | null> {
    return this.petModel.findOneAndDelete({ id:pet_id }).exec();
  }

  async findBySpecies(species: string): Promise<Pet[]> {
    return this.petModel.find({ species }).exec();
  }

  async findByOwnerId(user_id: string): Promise<Pet[]> {
    try {
      // Tìm tất cả thú cưng có owner.user_id = user_id
      return await this.petModel.find({ 'owner.user_id': user_id }).exec();
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi khi tìm thú cưng theo owner_id: ' + error.message,
      );
    }
  }

  async findByOwnerAndPetIds(user_id: string, pet_ids: string[]): Promise<Pet[]> {
    try {
      // Tìm thú cưng có owner.user_id = user_id và id nằm trong mảng pet_ids
      return await this.petModel.find({
        'owner.user_id': user_id,
        id: { $in: pet_ids }
      }).exec();
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi khi tìm thú cưng theo owner_id và danh sách pet_ids: ' + error.message,
      );
    }
  }
  async count(): Promise<number> {
    return this.petModel.countDocuments().exec();
  }
}
