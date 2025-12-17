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
  private redis = redisClient;
  private readonly cacheTTL = 3600;
  private readonly listCacheTTL = 600;

  constructor(@InjectModel(Pet.name) private petModel: Model<PetDocument>) {}

  private isRedisAvailable(): boolean {
    return this.redis && this.redis.isOpen;
  }

  private async safeGet(key: string): Promise<string | null> {
    try {
      if (!this.isRedisAvailable()) return null;
      return await this.redis.get(key);
    } catch (err) {
      return null;
    }
  }

  private async safeSet(key: string, value: string, options?: any) {
    try {
      if (!this.isRedisAvailable()) return;
      await this.redis.set(key, value, options);
    } catch (err) {}
  }

  private async safeDel(keys: string | string[]) {
    try {
      if (!this.isRedisAvailable()) return;
      await this.redis.del(keys);
    } catch (err) {}
  }

  private async safeScan(prefix: string): Promise<string[]> {
    if (!this.isRedisAvailable()) return [];

    const keys: string[] = [];
    try {
      let cursor = '0';
      do {
        const reply = await this.redis.scan(cursor, {
          MATCH: prefix,
          COUNT: 100,
        });
        cursor = reply.cursor;
        keys.push(...reply.keys);
      } while (cursor !== '0');
    } catch (err) {
      return [];
    }

    return keys;
  }

  private getPetKey(id: string): string {
    return `pet:${id}`;
  }

  private async invalidateSinglePetCache(id: string) {
    await this.safeDel(this.getPetKey(id));
  }

  private async invalidatePetListCaches() {
    const keys = await this.safeScan('pets:*');
    if (keys.length > 0) {
      await this.safeDel(keys);
    }
  }

  async create(petDataToSave: CreatePetDto | any): Promise<Pet> {
    try {
      const pet = await this.petModel.create(petDataToSave);

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
      if (cached) return JSON.parse(cached);

      const pets = await this.petModel.find().exec();

      await this.safeSet(cacheKey, JSON.stringify(pets), {
        EX: this.listCacheTTL,
      });

      return pets;
    } catch {
      return this.petModel.find().exec();
    }
  }

  async getAllPets(data: GetAllPetsDto): Promise<PaginatedPetsResponse<Pet>> {
    const cacheKey = `pets:list:${JSON.stringify(data)}`;

    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

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
      sort[sort_field || 'createdAt'] = sort_order === 'asc' ? 1 : -1;

      const [items, total] = await Promise.all([
        this.petModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(safeLimit)
          .exec(),
        this.petModel.countDocuments(filter).exec(),
      ]);

      const response = { items, total, page: safePage, limit: safeLimit };

      await this.safeSet(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (err) {
      throw new InternalServerErrorException(err);
    }
  }

  async findById(pet_id: string): Promise<Pet | null> {
    const cacheKey = this.getPetKey(pet_id);

    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

      const pet = await this.petModel.findOne({ id: pet_id }).exec();

      if (pet) {
        await this.safeSet(cacheKey, JSON.stringify(pet), {
          EX: this.cacheTTL,
        });
      }

      return pet;
    } catch {
      return this.petModel.findOne({ id: pet_id }).exec();
    }
  }

  async findByIds(pet_ids: string[]): Promise<Pet[]> {
    if (!pet_ids || pet_ids.length === 0) return [];

    try {
      return await this.petModel.find({ id: { $in: pet_ids } }).exec();
    } catch {
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
      if (cached) return JSON.parse(cached);

      const pets = await this.petModel.find({ species }).exec();

      await this.safeSet(cacheKey, JSON.stringify(pets), {
        EX: this.listCacheTTL,
      });

      return pets;
    } catch {
      return this.petModel.find({ species }).exec();
    }
  }

  async findByOwnerId(user_id: string): Promise<Pet[]> {
    const cacheKey = `pets:owner:${user_id}`;

    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

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
      if (cached) return JSON.parse(cached);

      const count = await this.petModel.countDocuments().exec();

      await this.safeSet(cacheKey, JSON.stringify(count), {
        EX: this.listCacheTTL,
      });

      return count;
    } catch {
      return this.petModel.countDocuments().exec();
    }
  }

  async countByOwnerId(user_id: string): Promise<number> {
    try {
      const count = await this.petModel
        .countDocuments({ 'owner.user_id': user_id })
        .exec();
      return count;
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi khi đếm số thú cưng theo owner_id: ' + error.message,
      );
    }
  }
}
