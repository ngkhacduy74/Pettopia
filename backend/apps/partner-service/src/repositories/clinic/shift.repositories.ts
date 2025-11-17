import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
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

// --- PHẦN THÊM VÀO ---
// 1. Import Redis client
import redisClient from '../../common/redis/redis.module.js';
// (Hãy đảm bảo đường dẫn import này chính xác với cấu trúc thư mục của bạn)
// --- KẾT THÚC PHẦN THÊM VÀO ---

@Injectable()
export class ShiftRepository {
  // --- PHẦN THÊM VÀO ---
  // 2. Khai báo redis và thời gian cache
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600; // 1 giờ cho cache 1 ca
  private readonly listCacheTTL = 600; // 10 phút cho cache danh sách
  // --- KẾT THÚC PHẦN THÊM VÀO ---

  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
  ) {
    // --- PHẦN THÊM VÀO ---
    // 3. Khởi tạo redis
    this.redis = redisClient;
    // --- KẾT THÚC PHẦN THÊM VÀO ---
  }

  // --- PHẦN THÊM VÀO: HÀM HELPER CHO CACHE ---

  /**
   * Lấy key cache cho một ca làm việc (shift) đơn lẻ
   */
  private getShiftKey(id: string): string {
    return `shift:${id}`;
  }

  /**
   * Xóa cache của một ca làm việc đơn lẻ
   */
  private async invalidateSingleShiftCache(id: string) {
    if (id) {
      await this.redis.del(this.getShiftKey(id));
    }
  }

  /**
   * Xóa tất cả cache danh sách và số đếm liên quan đến một clinic
   * (Dùng SCAN để duyệt an toàn, không làm block Redis)
   */
  private async invalidateClinicShiftListCache(clinic_id: string) {
    if (!clinic_id) return;

    // Xóa cache đếm
    await this.redis.del(`shifts:count:clinic:${clinic_id}`);

    // Xóa cache danh sách (ví dụ: 'shifts:clinic:clinic_123:...')
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
  }

  // --- KẾT THÚC PHẦN THÊM VÀO ---

  /**
   * Ghi (Write): Cần XÓA (invalidate) cache
   */
  async createClinicShift(dto: CreateClinicShiftDto): Promise<ShiftDocument> {
    try {
      // (Logic kiểm tra 'existingShift' của bạn...)
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

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache danh sách của clinic này
      await this.invalidateClinicShiftListCache(result.clinic_id);
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return result;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi tạo ca làm việc',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
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
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
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

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi lấy danh sách ca làm việc',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async getShiftsByClinicId(
    clinic_id: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: any[]; total: number }> {
    // Tạo key động
    const pageKey = page !== undefined ? page : 'all';
    const limitKey = limit !== undefined ? limit : 'all';
    const cacheKey = `shifts:clinic:${clinic_id}:${pageKey}:${limitKey}`;

    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
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

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi lấy danh sách ca làm việc',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async getShiftByIdAndClinic(
    shift_id: string,
    clinic_id: string,
  ): Promise<any> {
    // Dùng chung key cache với getShiftById
    const cacheKey = this.getShiftKey(shift_id);
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const shift = JSON.parse(cached);
        // Đảm bảo shift này đúng là của clinic đó
        return shift.clinic_id === clinic_id ? shift : null;
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const shift = await this.shiftModel
        .findOne({ id: shift_id, clinic_id })
        .lean();

      // 3. Lưu vào Redis (nếu tìm thấy)
      if (shift) {
        await this.redis.set(cacheKey, JSON.stringify(shift), {
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

  /**
   * Sửa (Update): Cần XÓA (invalidate) cache
   */
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

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache
      await this.invalidateSingleShiftCache(id);
      await this.invalidateClinicShiftListCache(updatedShift.clinic_id);
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return updatedShift;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi cập nhật ca làm việc',
      );
    }
  }

  /**
   * Xóa (Delete): Cần XÓA (invalidate) cache
   */
  async deleteClinicShift(id: string): Promise<any> {
    try {
      // Dùng findOneAndDelete để lấy được doc đã xóa (chứa clinic_id)
      const deletedShift = await this.shiftModel
        .findOneAndDelete({ id: id })
        .exec();

      if (!deletedShift) {
        throw new NotFoundException(
          `Không tìm thấy ca làm việc với ID: ${id} để xóa`,
        );
      }

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache
      await this.invalidateSingleShiftCache(id);
      await this.invalidateClinicShiftListCache(deletedShift.clinic_id);
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return deletedShift;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi xóa ca làm việc',
      );
    }
  }

  /**
   * Sửa (Update): Cần XÓA (invalidate) cache
   */
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

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache
      await this.invalidateSingleShiftCache(id);
      await this.invalidateClinicShiftListCache(updatedShift.clinic_id);
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return updatedShift;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi cập nhật trạng thái ca làm việc',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async getShiftById(id: string): Promise<any> {
    const cacheKey = this.getShiftKey(id);
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const result = await this.shiftModel.findOne({ id: id }).lean().exec();

      // 3. Lưu vào Redis (nếu tìm thấy)
      if (result) {
        await this.redis.set(cacheKey, JSON.stringify(result), {
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

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async countShiftByClinicId(clinic_id: string): Promise<number> {
    const cacheKey = `shifts:count:clinic:${clinic_id}`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const count = await this.shiftModel.countDocuments({
        clinic_id: clinic_id,
        // is_active: true (bạn đã comment nó, nên tôi cũng bỏ qua)
      });

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(count), {
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
