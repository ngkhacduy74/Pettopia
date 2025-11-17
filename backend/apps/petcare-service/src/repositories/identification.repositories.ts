import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Identification,
  IdentificationDocument,
} from 'src/schemas/identification.schema';
import { CreateIdentificationDto } from 'src/dto/pet/create-indentify.dto';
import { RpcException } from '@nestjs/microservices';

// --- PHẦN THÊM VÀO ---
// 1. Import Redis client
import redisClient from '../common/redis/redis.module.js';
// (Hãy đảm bảo đường dẫn import này chính xác với cấu trúc thư mục của bạn)
// --- KẾT THÚC PHẦN THÊM VÀO ---

@Injectable()
export class IdentificationRepository {
  // --- PHẦN THÊM VÀO ---
  // 2. Khai báo redis và thời gian cache
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600; // Cache 1 giờ
  // --- KẾT THÚC PHẦN THÊM VÀO ---

  constructor(
    @InjectModel(Identification.name)
    private identificationModel: Model<IdentificationDocument>,
  ) {
    // --- PHẦN THÊM VÀO ---
    // 3. Khởi tạo redis
    this.redis = redisClient;
    // --- KẾT THÚC PHẦN THÊM VÀO ---
  }

  // --- PHẦN THÊM VÀO: HÀM HELPER CHO CACHE ---

  /**
   * Lấy key cache bằng pet_id
   */
  private getKeyByPetId(pet_id: string): string {
    return `identification:pet:${pet_id}`;
  }

  /**
   * Lấy key cache bằng identification_id
   */
  private getKeyByIdentify(id_identify: string): string {
    return `identification:id:${id_identify}`;
  }

  /**
   * Xóa tất cả cache liên quan đến một đối tượng Identification
   */
  private async invalidateCache(
    pet_id: string,
    identification_id: string,
  ) {
    try {
      if (pet_id) {
        await this.redis.del(this.getKeyByPetId(pet_id));
      }
      if (identification_id) {
        await this.redis.del(this.getKeyByIdentify(identification_id));
      }
    } catch (err) {
      console.error('Lỗi khi xóa cache identification:', err);
    }
  }

  // --- KẾT THÚC PHẦN THÊM VÀO ---

  /**
   * Ghi (Write): "Làm nóng" cache (Cache Warming)
   */
  async create(data: any): Promise<any> {
    try {
      const saved = await this.identificationModel.create(data);

      // --- PHẦN THÊM VÀO ---
      // 4. "Làm nóng" cache thay vì xóa
      if (saved) {
        if (saved.pet_id) {
          await this.redis.set(
            this.getKeyByPetId(saved.pet_id),
            JSON.stringify(saved),
            { EX: this.cacheTTL },
          );
        }
        if (saved.identification_id) {
          await this.redis.set(
            this.getKeyByIdentify(saved.identification_id),
            JSON.stringify(saved),
            { EX: this.cacheTTL },
          );
        }
      }
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return saved;
    } catch (err) {
      throw new RpcException(err.message || 'Không thể lưu identification');
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findByPetId(pet_id: string): Promise<Identification | null> {
    const cacheKey = this.getKeyByPetId(pet_id);
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const result = await this.identificationModel.findOne({ pet_id }).lean(); // Thêm .lean()

      // 3. Lưu vào Redis (nếu tìm thấy)
      if (result) {
        await this.redis.set(cacheKey, JSON.stringify(result), {
          EX: this.cacheTTL,
        });
      }

      return result;
    } catch (err) {
      throw new RpcException(
        err.message || 'Không thể tìm identification theo pet_id',
      );
    }
  }

  /**
   * Sửa (Update): Cần XÓA (invalidate) cache
   */
  async updateByPetId(
    pet_id: string,
    updateData: any,
  ): Promise<Identification | null> {
    try {
      // Tìm bản ghi cũ TRƯỚC khi cập nhật để lấy identification_id
      const oldDoc = await this.identificationModel
        .findOne({ pet_id })
        .lean();

      const updated = await this.identificationModel.findOneAndUpdate(
        { pet_id },
        updateData,
        { new: true },
      );

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache
      if (oldDoc) {
        // Xóa cache cũ
        await this.invalidateCache(
          oldDoc.pet_id,
          oldDoc.identification_id,
        );
      }
      if (updated) {
        // Xóa cache mới (phòng trường hợp identification_id bị thay đổi)
        await this.invalidateCache(
          updated.pet_id,
          updated.identification_id,
        );
      }
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return updated;
    } catch (err) {
      throw new RpcException(
        err.message || 'Không thể cập nhật identification theo pet_id',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async checkIdExist(id_identify: string): Promise<Identification | null> {
    const cacheKey = this.getKeyByIdentify(id_identify);
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const result = await this.identificationModel
        .findOne({
          identification_id: id_identify,
        })
        .lean(); // Thêm .lean()

      // 3. Lưu vào Redis (nếu tìm thấy)
      if (result) {
        await this.redis.set(cacheKey, JSON.stringify(result), {
          EX: this.cacheTTL,
        });
      }

      return result;
    } catch (err) {
      throw new RpcException(err.message || 'Không thể check identification');
    }
  }

  /**
   * Xóa (Delete): Cần XÓA (invalidate) cache
   */
  async deleteByPetId(pet_id: string): Promise<boolean> {
    // Tìm bản ghi TRƯỚC khi xóa để lấy identification_id
    const docToDelete = await this.identificationModel
      .findOne({ pet_id })
      .lean();

    const result = await this.identificationModel.deleteOne({ pet_id });

    // --- PHẦN THÊM VÀO ---
    // 4. Xóa cache
    if (result.deletedCount > 0 && docToDelete) {
      await this.invalidateCache(
        docToDelete.pet_id,
        docToDelete.identification_id,
      );
    }
    // --- KẾT THÚC PHẦN THÊM VÀO ---

    return result.deletedCount > 0;
  }
}