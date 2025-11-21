import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pet, PetDocument } from '../schemas/pet.schema';
import { CreatePetDto } from '../dto/pet/create-pet.dto';
import { GetAllPetsDto } from '../dto/pet/get-all-pets.dto';
import { PaginatedPetsResponse } from '../dto/pet/paginated-pets-response.dto';

import redisClient from '../common/redis/redis.module.js';

@Injectable()
export class PetRepository {
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600;
  private readonly listCacheTTL = 600;

  constructor(@InjectModel(Pet.name) private petModel: Model<PetDocument>) {
    this.redis = redisClient;
  }

  // --- CÁC HÀM HELPER AN TOÀN (SAFE WRAPPERS) ---
  private async safeGet(key: string): Promise<string | null> {
    try {
      if (!this.redis.isOpen) return null;
      return await this.redis.get(key);
    } catch (error) {
      return null;
    }
  }

  private async safeSet(key: string, value: string, options?: any) {
    try {
      if (!this.redis.isOpen) return;
      await this.redis.set(key, value, options);
    } catch (error) {}
  }

  private async safeDel(keys: string | string[]) {
    try {
      if (!this.redis.isOpen) return;
      await this.redis.del(keys);
    } catch (error) {}
  }
  // --- KẾT THÚC HELPER ---

  private getPetKey(id: string): string {
    return `pet:${id}`;
  }

  private async invalidateSinglePetCache(petId: string) {
    if (petId) {
      await this.safeDel(this.getPetKey(petId));
    }
  }

  private async invalidatePetListCaches() {
    if (!this.redis.isOpen) return;
    try {
      let cursor = '0';
      const matchPattern = 'pets:*';
      do {
        const reply = await this.redis.scan(cursor, {
          MATCH: matchPattern,
          COUNT: 100,
        });
        cursor = reply.cursor;
        const keys = reply.keys;
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } while (cursor !== '0');
    } catch (err) {}
  }

  async create(petDataToSave: CreatePetDto | any): Promise<Pet> {
    try {
      const pet = await this.petModel.create(petDataToSave);

      if (!pet) {
        throw new InternalServerErrorException('Không thể tạo pet trong DB');
      }

      await this.invalidatePetListCaches();

      return pet;
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi khi lưu Pet vào cơ sở dữ liệu: ' + error.message,
      );
    }
  }

  async findAll(): Promise<Pet[]> {
    const cacheKey = 'pets:all';
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const pets = await this.petModel.find().exec();

      await this.safeSet(cacheKey, JSON.stringify(pets), {
        EX: this.listCacheTTL,
      });

      return pets;
    } catch (error) {
      return this.petModel.find().exec();
    }
  }

  async getAllPets(data: GetAllPetsDto): Promise<PaginatedPetsResponse<Pet>> {
    const cacheKey = `pets:list:${JSON.stringify(data)}`;
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

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
      if (species) filter.species = species;
      if (gender) filter.gender = gender;

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

      const response = {
        items,
        total,
        page: safePage,
        limit: safeLimit,
      };

      await this.safeSet(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (err) {
      throw new Error(err);
    }
  }

  async findById(pet_id: string): Promise<Pet | null> {
    const cacheKey = this.getPetKey(pet_id);
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const pet = await this.petModel.findOne({ id: pet_id }).exec();

      if (pet) {
        await this.safeSet(cacheKey, JSON.stringify(pet), {
          EX: this.cacheTTL,
        });
      }

      return pet;
    } catch (error) {
      return this.petModel.findOne({ id: pet_id }).exec();
    }
  }

  async findByIds(pet_ids: string[]): Promise<Pet[]> {
    if (!pet_ids || pet_ids.length === 0) {
      return [];
    }

    try {
      const pets = await this.petModel.find({ id: { $in: pet_ids } }).exec();
      return pets;
    } catch (error) {
      console.error('Error finding pets by IDs:', error);
      return [];
    }
  }

  async update(pet_id: string, updateData: any): Promise<Pet> {
    try {
      const updatedPet = await this.petModel
        .findOneAndUpdate({ id: pet_id }, updateData, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedPet) {
        throw new InternalServerErrorException(
          `Không tìm thấy thú cưng với ID: ${pet_id}`,
        );
      }

      await this.invalidateSinglePetCache(pet_id);
      await this.invalidatePetListCaches();

      return updatedPet;
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi khi cập nhật Pet: ' + error.message,
      );
    }
  }

  async delete(pet_id: string): Promise<Pet | null> {
    const deletedPet = await this.petModel
      .findOneAndDelete({ id: pet_id })
      .exec();

    if (deletedPet) {
      await this.invalidateSinglePetCache(pet_id);
      await this.invalidatePetListCaches();
    }

    return deletedPet;
  }

  async findBySpecies(species: string): Promise<Pet[]> {
    const cacheKey = `pets:species:${species}`;
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const pets = await this.petModel.find({ species }).exec();

      await this.safeSet(cacheKey, JSON.stringify(pets), {
        EX: this.listCacheTTL,
      });

      return pets;
    } catch (error) {
      return this.petModel.find({ species }).exec();
    }
  }

  async findByOwnerId(user_id: string): Promise<Pet[]> {
    const cacheKey = `pets:owner:${user_id}`;
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const pets = await this.petModel
        .find({ 'owner.user_id': user_id })
        .exec();

      await this.safeSet(cacheKey, JSON.stringify(pets), {
        EX: this.listCacheTTL,
      });

      return pets;
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi khi tìm thú cưng theo owner_id: ' + error.message,
      );
    }
  }

  async count(): Promise<number> {
    const cacheKey = 'pets:count';
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const count = await this.petModel.countDocuments().exec();

      await this.safeSet(cacheKey, JSON.stringify(count), {
        EX: this.listCacheTTL,
      });

      return count;
    } catch (error) {
      return this.petModel.countDocuments().exec();
    }
  }
}
