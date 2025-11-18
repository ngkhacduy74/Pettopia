import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Shift,
  ShiftDocument,
} from 'src/schemas/clinic/clinic_shift_setting.schema';
import { CreateClinicShiftDto } from 'src/dto/clinic/shift/create-shift.dto';
import { UpdateClinicShiftDto } from 'src/dto/clinic/shift/update-shift.dto';

import redisClient from '../../common/redis/redis.module.js';

@Injectable()
export class ShiftRepository {
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600;
  private readonly listCacheTTL = 600;

  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
  ) {
    this.redis = redisClient;
  }

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

  private getShiftKey(id: string): string {
    return `shift:${id}`;
  }

  private async invalidateSingleShiftCache(id: string) {
    if (id) {
      await this.safeDel(this.getShiftKey(id));
    }
  }

  private async invalidateClinicShiftListCache(clinic_id: string) {
    if (!clinic_id || !this.redis.isOpen) return;

    try {
      await this.redis.del(`shifts:count:clinic:${clinic_id}`);

      let cursor = '0';
      const matchPattern = `shifts:clinic:${clinic_id}:*`;
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

  async createClinicShift(dto: CreateClinicShiftDto): Promise<ShiftDocument> {
    try {
      const existingShift = await this.shiftModel.findOne({
        clinic_id: dto.clinic_id,
        shift: dto.shift,
      });

      if (existingShift) {
        throw new BadRequestException(
          `Ca làm việc '${dto.shift}' đã tồn tại cho phòng khám này`,
        );
      }

      const newShift = new this.shiftModel(dto);
      const result = await newShift.save();

      await this.invalidateClinicShiftListCache(result.clinic_id);

      return result;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi tạo ca làm việc',
      );
    }
  }

  async getClinicShifts(
    page: number,
    limit: number,
    clinic_id: string,
  ): Promise<{
    data: any;
    total: number;
    page: number;
    limit: number;
  }> {
    const cacheKey = `shifts:clinic:${clinic_id}:${page}:${limit}`;
    const skip = (page - 1) * limit;
    const query = { clinic_id };

    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const [data, total] = await Promise.all([
        this.shiftModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.shiftModel.countDocuments(query).exec(),
      ]);

      const response = { data, total, page, limit };

      await this.safeSet(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi lấy danh sách ca làm việc',
      );
    }
  }

  async getShiftsByClinicId(
    clinic_id: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: any[]; total: number }> {
    const pageKey = page !== undefined ? page : 'all';
    const limitKey = limit !== undefined ? limit : 'all';
    const cacheKey = `shifts:clinic:${clinic_id}:${pageKey}:${limitKey}`;

    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      let response: { data: any[]; total: number };
      if (page !== undefined && limit !== undefined) {
        const skip = (page - 1) * limit;
        const [shifts, total] = await Promise.all([
          this.shiftModel.find({ clinic_id }).skip(skip).limit(limit).lean(),
          this.shiftModel.countDocuments({ clinic_id }),
        ]);
        response = { data: shifts, total };
      } else {
        const shifts = await this.shiftModel.find({ clinic_id }).lean();
        response = { data: shifts, total: shifts.length };
      }

      await this.safeSet(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi lấy danh sách ca làm việc',
      );
    }
  }

  async getShiftByIdAndClinic(
    shift_id: string,
    clinic_id: string,
  ): Promise<any> {
    const cacheKey = this.getShiftKey(shift_id);
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        const shift = JSON.parse(cached);
        return shift.clinic_id === clinic_id ? shift : null;
      }

      const shift = await this.shiftModel
        .findOne({ id: shift_id, clinic_id })
        .lean();

      if (shift) {
        await this.safeSet(cacheKey, JSON.stringify(shift), {
          EX: this.cacheTTL,
        });
      }
      return shift;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi lấy thông tin ca làm việc',
      );
    }
  }

  async updateClinicShift(
    id: string,
    dto: UpdateClinicShiftDto,
  ): Promise<ShiftDocument> {
    try {
      const updatedShift = await this.shiftModel
        .findOneAndUpdate({ id: id }, dto, { new: true })
        .exec();

      if (!updatedShift) {
        throw new NotFoundException(`Không tìm thấy ca làm việc với ID: ${id}`);
      }

      await this.invalidateSingleShiftCache(id);
      await this.invalidateClinicShiftListCache(updatedShift.clinic_id);

      return updatedShift;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi cập nhật ca làm việc',
      );
    }
  }

  async deleteClinicShift(id: string): Promise<any> {
    try {
      const deletedShift = await this.shiftModel
        .findOneAndDelete({ id: id })
        .exec();

      if (!deletedShift) {
        throw new NotFoundException(
          `Không tìm thấy ca làm việc với ID: ${id} để xóa`,
        );
      }

      await this.invalidateSingleShiftCache(id);
      await this.invalidateClinicShiftListCache(deletedShift.clinic_id);

      return deletedShift;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi xóa ca làm việc',
      );
    }
  }

  async updateClinicShiftStatus(
    id: string,
    is_active: boolean,
  ): Promise<ShiftDocument> {
    try {
      const updatedShift = await this.shiftModel
        .findOneAndUpdate({ id: id }, { is_active: is_active }, { new: true })
        .exec();

      if (!updatedShift) {
        throw new NotFoundException(
          `Không tìm thấy ca làm việc với ID: ${id} để cập nhật trạng thái`,
        );
      }

      await this.invalidateSingleShiftCache(id);
      await this.invalidateClinicShiftListCache(updatedShift.clinic_id);

      return updatedShift;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi cập nhật trạng thái ca làm việc',
      );
    }
  }

  async getShiftById(id: string): Promise<any> {
    const cacheKey = this.getShiftKey(id);
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await this.shiftModel.findOne({ id: id }).lean().exec();

      if (result) {
        await this.safeSet(cacheKey, JSON.stringify(result), {
          EX: this.cacheTTL,
        });
      }

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi tìm kiếm ca làm việc',
      );
    }
  }

  async countShiftByClinicId(clinic_id: string): Promise<number> {
    const cacheKey = `shifts:count:clinic:${clinic_id}`;
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const count = await this.shiftModel.countDocuments({
        clinic_id: clinic_id,
      });

      await this.safeSet(cacheKey, JSON.stringify(count), {
        EX: this.listCacheTTL,
      });

      return count;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi đếm số lượng ca khám theo phòng khám',
      );
    }
  }
}
