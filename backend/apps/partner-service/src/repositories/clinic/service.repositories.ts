import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from '../../schemas/clinic/service.schema';
import { CreateServiceDto } from 'src/dto/clinic/services/create-service.dto';

import redisClient from '../../common/redis/redis.module';

@Injectable()
export class ServiceRepository {
  private redis = redisClient;
  private readonly serviceCacheTTL = 3600;
  private readonly listCacheTTL = 600;

  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  // ============================================================
  // SAFE REDIS WRAPPERS — không bao giờ throw, luôn fallback DB
  // ============================================================

  private isRedisReady(): boolean {
    return this.redis && this.redis.isOpen;
  }

  private async safeGet(key: string): Promise<string | null> {
    try {
      if (!this.isRedisReady()) return null;
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  private async safeSet(key: string, value: string, options?: any) {
    try {
      if (!this.isRedisReady()) return;
      await this.redis.set(key, value, options);
    } catch {}
  }

  private async safeDel(keys: string | string[]) {
    try {
      if (!this.isRedisReady()) return;
      await this.redis.del(keys);
    } catch {}
  }

  private getServiceKey(id: string): string {
    return `service:${id}`;
  }

  private async invalidateServiceCache(serviceId: string) {
    if (serviceId) {
      await this.safeDel(this.getServiceKey(serviceId));
    }
  }

  private async invalidateAllServiceLists() {
    if (!this.isRedisReady()) return;

    try {
      let cursor = '0';
      do {
        const reply = await this.redis.scan(cursor, {
          MATCH: 'services:*',
          COUNT: 100,
        });

        cursor = reply.cursor;
        if (reply.keys.length > 0) {
          await this.safeDel(reply.keys);
        }
      } while (cursor !== '0');
    } catch {}
  }

  async createService(
    data: CreateServiceDto,
    clinic_id: string,
  ): Promise<Service> {
    try {
      const newService = new this.serviceModel({ ...data, clinic_id });
      const result = await newService.save();

      await this.invalidateAllServiceLists();
      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi tạo dịch vụ',
      );
    }
  }

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
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.serviceModel.find().skip(skip).limit(limit).lean().exec(),
        this.serviceModel.countDocuments(),
      ]);

      const response = { data, total, page, limit };

      await this.safeSet(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi lấy danh sách dịch vụ',
      );
    }
  }

  async findServicesByClinicId(
    clinicId: string,
    skip: number,
    limit: number,
  ): Promise<Service[]> {
    const cacheKey = `services:clinic:${clinicId}:${skip}:${limit}:simple`;

    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

      const result = await this.serviceModel
        .find({ clinic_id: clinicId, is_active: true })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      await this.safeSet(cacheKey, JSON.stringify(result), {
        EX: this.listCacheTTL,
      });

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi lấy danh sách dịch vụ theo phòng khám',
      );
    }
  }

  async countServicesByClinicId(clinicId: string): Promise<number> {
    const cacheKey = `services:count:clinic:${clinicId}`;

    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

      const count = await this.serviceModel.countDocuments({
        clinic_id: clinicId,
        is_active: true,
      });

      await this.safeSet(cacheKey, JSON.stringify(count), {
        EX: this.listCacheTTL,
      });

      return count;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi đếm số lượng dịch vụ theo phòng khám',
      );
    }
  }

  async updateService(
    serviceId: string,
    updateServiceDto: any,
    clinic_id?: string,
  ): Promise<Service | null> {
    try {
      const query: any = { id: serviceId };
      if (clinic_id) {
        query.clinic_id = clinic_id;
      }

      const result = await this.serviceModel.findOneAndUpdate(
        query,
        { $set: updateServiceDto },
        { new: true },
      );

      if (!result) {
        throw new InternalServerErrorException(
          'Không tìm thấy dịch vụ cần cập nhật',
        );
      }

      await this.invalidateServiceCache(serviceId);
      await this.invalidateAllServiceLists();

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi cập nhật dịch vụ',
      );
    }
  }

  async removeService(serviceId: string, clinic_id: string): Promise<any> {
    try {
      const result = await this.serviceModel.deleteOne({
        id: serviceId,
        clinic_id,
      });

      if (result.deletedCount === 0) {
        throw new InternalServerErrorException('Không tìm thấy dịch vụ để xóa');
      }

      await this.invalidateServiceCache(serviceId);
      await this.invalidateAllServiceLists();

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi xóa dịch vụ',
      );
    }
  }

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

      await this.invalidateServiceCache(id);
      await this.invalidateAllServiceLists();

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi cập nhật trạng thái dịch vụ',
      );
    }
  }

  async getServicesByClinicId(
    clinic_id: string,
    page: number,
    limit: number,
  ): Promise<{ data: Service[]; total: number; page: number; limit: number }> {
    const cacheKey = `services:clinic:${clinic_id}:${page}:${limit}:full`;

    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

      const skip = (page - 1) * limit;
      const filter = { clinic_id, is_active: true };

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

      await this.safeSet(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi truy vấn dịch vụ theo phòng khám',
      );
    }
  }

  async getServiceById(id: string): Promise<Service | null> {
    const cacheKey = this.getServiceKey(id);

    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

      const service = await this.serviceModel.findOne({ id }).lean().exec();

      if (service) {
        await this.safeSet(cacheKey, JSON.stringify(service), {
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
