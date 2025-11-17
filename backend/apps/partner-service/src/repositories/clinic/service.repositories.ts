import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from '../../schemas/clinic/service.schema';
import { CreateServiceDto } from 'src/dto/clinic/services/create-service.dto';

// --- PHẦN THÊM VÀO ---
// 1. Import Redis client
import redisClient from '../../common/redis/redis.module.js';
// (Hãy đảm bảo đường dẫn import này chính xác với cấu trúc thư mục của bạn)
// --- KẾT THÚC PHẦN THÊM VÀO ---

@Injectable()
export class ServiceRepository {
  // --- PHẦN THÊM VÀO ---
  // 2. Khai báo redis và thời gian cache
  private redis: typeof redisClient;
  private readonly serviceCacheTTL = 3600; // Cache 1 giờ
  private readonly listCacheTTL = 600; // Cache 10 phút
  // --- KẾT THÚC PHẦN THÊM VÀO ---

  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {
    // --- PHẦN THÊM VÀO ---
    // 3. Khởi tạo redis
    this.redis = redisClient;
    // --- KẾT THÚC PHẦN THÊM VÀO ---
  }

  // --- PHẦN THÊM VÀO: HÀM HELPER CHO CACHE ---

  /**
   * Lấy key cache cho một service đơn lẻ
   */
  private getServiceKey(id: string): string {
    return `service:${id}`;
  }

  /**
   * Xóa cache của một service đơn lẻ
   */
  private async invalidateServiceCache(serviceId: string) {
    if (serviceId) {
      await this.redis.del(this.getServiceKey(serviceId));
    }
  }

  /**
   * Xóa tất cả cache liên quan đến danh sách hoặc số đếm (dùng SCAN, an toàn)
   */
  private async invalidateAllServiceLists() {
    let cursor = '0';
    do {
      // Quét an toàn, không làm block Redis, tìm các key 'services:' (chỉ danh sách/đếm)
      const reply = await this.redis.scan(cursor, {
        MATCH: 'services:*', // Chỉ các key bắt đầu bằng 'services:'
        COUNT: 100,
      });
      cursor = reply.cursor;
      const keys = reply.keys;
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } while (cursor !== '0');
  }

  // --- KẾT THÚC PHẦN THÊM VÀO ---

  /**
   * Ghi (Write): Cần XÓA (invalidate) cache
   */
  async createService(
    data: CreateServiceDto,
    clinic_id: string,
  ): Promise<Service> {
    try {
      const newService = new this.serviceModel({ ...data, clinic_id });
      const result = await newService.save();

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache danh sách
      await this.invalidateAllServiceLists();
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi tạo dịch vụ',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async getAllService(
    page: number,
    limit: number,
  ): Promise<{
    data: Service[];
    total: number;
    page: number;
    limit: number;
  }> {
    const cacheKey = `services:all:${page}:${limit}`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.serviceModel.find().skip(skip).limit(limit).lean().exec(),
        this.serviceModel.countDocuments(),
      ]);

      const response = { data, total, page, limit };

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi lấy danh sách dịch vụ',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findServicesByClinicId(
    clinicId: string,
    skip: number,
    limit: number,
  ): Promise<Service[]> {
    const cacheKey = `services:clinic:${clinicId}:${skip}:${limit}:simple`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const result = await this.serviceModel
        .find({ clinic_id: clinicId, is_active: true })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(result), {
        EX: this.listCacheTTL,
      });

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi lấy danh sách dịch vụ theo phòng khám',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async countServicesByClinicId(clinicId: string): Promise<number> {
    const cacheKey = `services:count:clinic:${clinicId}`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const count = await this.serviceModel.countDocuments({
        clinic_id: clinicId,
        is_active: true,
      });

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(count), {
        EX: this.listCacheTTL,
      });

      return count;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi đếm số lượng dịch vụ theo phòng khám',
      );
    }
  }

  /**
   * Sửa (Update): Cần XÓA (invalidate) cache
   */
  async updateService(
    serviceId: string,
    updateServiceDto: any,
    clinic_id: string,
  ): Promise<Service | null> {
    try {
      const result = await this.serviceModel.findOneAndUpdate(
        { id: serviceId, clinic_id },
        { $set: updateServiceDto },
        { new: true },
      );

      if (!result) {
        throw new InternalServerErrorException(
          'Không tìm thấy dịch vụ cần cập nhật',
        );
      }

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache
      await this.invalidateServiceCache(serviceId);
      await this.invalidateAllServiceLists();
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi cập nhật dịch vụ',
      );
    }
  }

  /**
   * Xóa (Delete): Cần XÓA (invalidate) cache
   */
  async removeService(serviceId: string, clinic_id: string): Promise<any> {
    try {
      const result = await this.serviceModel.deleteOne({
        id: serviceId,
        clinic_id,
      });

      if (result.deletedCount === 0) {
        throw new InternalServerErrorException('Không tìm thấy dịch vụ để xóa');
      }

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache
      await this.invalidateServiceCache(serviceId);
      await this.invalidateAllServiceLists();
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi xóa dịch vụ',
      );
    }
  }

  /**
   * Sửa (Update): Cần XÓA (invalidate) cache
   */
  async updateServiceStatus(id: string, is_active: boolean): Promise<Service> {
    try {
      const result = await this.serviceModel.findOneAndUpdate(
        { id },
        { is_active },
        { new: true },
      );

      if (!result) {
        throw new InternalServerErrorException(
          'Không tìm thấy dịch vụ cần cập nhật trạng thái',
        );
      }

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache
      await this.invalidateServiceCache(id);
      await this.invalidateAllServiceLists();
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi cập nhật trạng thái dịch vụ',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async getServicesByClinicId(
    clinic_id: string,
    page: number,
    limit: number,
  ): Promise<{
    data: Service[];
    total: number;
    page: number;
    limit: number;
  }> {
    const cacheKey = `services:clinic:${clinic_id}:${page}:${limit}:full`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const skip = (page - 1) * limit;
      const filter = { clinic_id: clinic_id, is_active: true };

      const [data, total] = await Promise.all([
        this.serviceModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.serviceModel.countDocuments(filter),
      ]);

      const response = { data, total, page, limit };

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi truy vấn dịch vụ theo phòng khám',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async getServiceById(id: string): Promise<Service | null> {
    const cacheKey = this.getServiceKey(id);
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const service = await this.serviceModel.findOne({ id }).lean().exec();

      // 3. Lưu vào Redis (nếu tìm thấy)
      if (service) {
        await this.redis.set(cacheKey, JSON.stringify(service), {
          EX: this.serviceCacheTTL,
        });
      }

      return service;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi truy vấn dịch vụ theo ID',
      );
    }
  }
}
