import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pet, PetDocument } from '../schemas/pet.schema';
import { CreatePetDto } from '../dto/pet/create-pet.dto';
// import { UpdatePetDto } from '../dto/pet/update-pet.dto';
import { GetAllPetsDto } from '../dto/pet/get-all-pets.dto';
import { PaginatedPetsResponse } from '../dto/pet/paginated-pets-response.dto';

// --- PHẦN THÊM VÀO ---
// 1. Import Redis client
import redisClient from '../common/redis/redis.module.js';
// (Hãy đảm bảo đường dẫn import này chính xác với cấu trúc thư mục của bạn)
// --- KẾT THÚC PHẦN THÊM VÀO ---

@Injectable()
export class PetRepository {
  // --- PHẦN THÊM VÀO ---
  // 2. Khai báo redis và thời gian cache
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600; // 1 giờ cho cache 1 thú cưng
  private readonly listCacheTTL = 600; // 10 phút cho cache danh sách
  // --- KẾT THÚC PHẦN THÊM VÀO ---

  constructor(@InjectModel(Pet.name) private petModel: Model<PetDocument>) {
    // --- PHẦN THÊM VÀO ---
    // 3. Khởi tạo redis
    this.redis = redisClient;
    // --- KẾT THÚC PHẦN THÊM VÀO ---
  }

  // --- PHẦN THÊM VÀO: HÀM HELPER CHO CACHE ---

  /**
   * Lấy key cache cho một thú cưng (pet) đơn lẻ
   */
  private getPetKey(id: string): string {
    return `pet:${id}`;
  }

  /**
   * Xóa cache của một thú cưng đơn lẻ
   */
  private async invalidateSinglePetCache(petId: string) {
    if (petId) {
      await this.redis.del(this.getPetKey(petId));
    }
  }

  /**
   * Xóa tất cả cache danh sách và số đếm liên quan đến thú cưng
   * (Dùng SCAN để duyệt an toàn, không làm block Redis)
   */
  private async invalidatePetListCaches() {
    try {
      let cursor = '0';
      const matchPattern = 'pets:*'; // Quét tất cả key bắt đầu bằng 'pets:'
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
    } catch (err) {
      console.error('Lỗi khi xóa cache danh sách pet:', err);
    }
  }

  // --- KẾT THÚC PHẦN THÊM VÀO ---

  /**
   * Ghi (Write): Cần XÓA (invalidate) cache
   */
  async create(petDataToSave: CreatePetDto | any): Promise<Pet> {
    try {
      const pet = await this.petModel.create(petDataToSave);

      if (!pet) {
        throw new InternalServerErrorException('Không thể tạo pet trong DB');
      }

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache danh sách
      await this.invalidatePetListCaches();
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return pet;
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi khi lưu Pet vào cơ sở dữ liệu: ' + error.message,
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findAll(): Promise<Pet[]> {
    const cacheKey = 'pets:all';
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const pets = await this.petModel.find().exec();

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(pets), {
        EX: this.listCacheTTL,
      });

      return pets;
    } catch (error) {
      // Fallback: Nếu Redis lỗi, vẫn lấy từ DB
      return this.petModel.find().exec();
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside (cho hàm phức tạp)
   */
  async getAllPets(data: GetAllPetsDto): Promise<PaginatedPetsResponse<Pet>> {
    const cacheKey = `pets:list:${JSON.stringify(data)}`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
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

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (err) {
      throw new Error(err);
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findById(pet_id: string): Promise<Pet | null> {
    const cacheKey = this.getPetKey(pet_id);
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const pet = await this.petModel.findOne({ id: pet_id }).exec();

      // 3. Lưu vào Redis (nếu tìm thấy)
      if (pet) {
        await this.redis.set(cacheKey, JSON.stringify(pet), {
          EX: this.cacheTTL,
        });
      }

      return pet;
    } catch (error) {
      // Fallback
      return this.petModel.findOne({ id: pet_id }).exec();
    }
  }

  /**
   * Sửa (Update): Cần XÓA (invalidate) cache
   */
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

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache
      await this.invalidateSinglePetCache(pet_id);
      await this.invalidatePetListCaches();
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return updatedPet;
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi khi cập nhật Pet: ' + error.message,
      );
    }
  }

  /**
   * Xóa (Delete): Cần XÓA (invalidate) cache
   */
  async delete(pet_id: string): Promise<Pet | null> {
    const deletedPet = await this.petModel
      .findOneAndDelete({ id: pet_id })
      .exec();

    // --- PHẦN THÊM VÀO ---
    // 4. Xóa cache
    if (deletedPet) {
      await this.invalidateSinglePetCache(pet_id);
      await this.invalidatePetListCaches();
    }
    // --- KẾT THÚC PHẦN THÊM VÀO ---

    return deletedPet;
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findBySpecies(species: string): Promise<Pet[]> {
    const cacheKey = `pets:species:${species}`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const pets = await this.petModel.find({ species }).exec();

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(pets), {
        EX: this.listCacheTTL,
      });

      return pets;
    } catch (error) {
      // Fallback
      return this.petModel.find({ species }).exec();
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findByOwnerId(user_id: string): Promise<Pet[]> {
    const cacheKey = `pets:owner:${user_id}`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const pets = await this.petModel
        .find({ 'owner.user_id': user_id })
        .exec();

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(pets), {
        EX: this.listCacheTTL,
      });

      return pets;
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi khi tìm thú cưng theo owner_id: ' + error.message,
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async count(): Promise<number> {
    const cacheKey = 'pets:count';
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const count = await this.petModel.countDocuments().exec();

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(count), {
        EX: this.listCacheTTL,
      });

      return count;
    } catch (error) {
      // Fallback
      return this.petModel.countDocuments().exec();
    }
  }
}
