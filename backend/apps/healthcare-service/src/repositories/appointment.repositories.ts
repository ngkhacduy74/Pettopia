import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Appointment,
  AppointmentDocument,
  AppointmentSchema,
} from '../schemas/appoinment.schema';
import { CreateAppointmentDto } from 'src/dto/appointment.dto';

// --- PHẦN THÊM VÀO ---
// 1. Import Redis client
import redisClient from '../common/redis/redis.module.js';
// (Hãy đảm bảo đường dẫn import này chính xác với cấu trúc thư mục của bạn)
// --- KẾT THÚC PHẦN THÊM VÀO ---

@Injectable()
export class AppointmentRepository {
  // --- PHẦN THÊM VÀO ---
  // 2. Khai báo redis và thời gian cache
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600; // 1 giờ cho cache 1 lịch hẹn
  private readonly listCacheTTL = 600; // 10 phút cho cache danh sách
  // --- KẾT THÚC PHẦN THÊM VÀO ---

  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
  ) {
    // --- PHẦN THÊM VÀO ---
    // 3. Khởi tạo redis
    this.redis = redisClient;
    // --- KẾT THÚC PHẦN THÊM VÀO ---
  }

  // --- PHẦN THÊM VÀO: HÀM HELPER CHO CACHE ---

  /**
   * Lấy key cache cho một lịch hẹn đơn lẻ
   */
  private getAppointmentKey(id: string): string {
    return `appointment:${id}`;
  }

  /**
   * Xóa cache của một lịch hẹn đơn lẻ
   */
  private async invalidateSingleAppointmentCache(id: string) {
    if (id) {
      await this.redis.del(this.getAppointmentKey(id));
    }
  }

  /**
   * Xóa tất cả cache danh sách liên quan đến user hoặc clinic
   * (Dùng SCAN để duyệt an toàn, không làm block Redis)
   */
  private async invalidateAppointmentLists(
    userId?: string,
    clinicId?: string,
  ) {
    // Luôn xóa cache 'all'
    const prefixes = ['appointments:all:*'];
    if (userId) {
      prefixes.push(`appointments:user:${userId}:*`);
    }
    if (clinicId) {
      prefixes.push(`appointments:clinic:${clinicId}:*`);
    }

    try {
      for (const prefix of prefixes) {
        let cursor = '0';
        do {
          const reply = await this.redis.scan(cursor, {
            MATCH: prefix,
            COUNT: 100,
          });
          cursor = reply.cursor;
          const keys = reply.keys;
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } while (cursor !== '0');
      }
    } catch (err) {
      console.error('Lỗi khi xóa cache danh sách lịch hẹn:', err);
    }
  }

  // --- KẾT THÚC PHẦN THÊM VÀO ---

  /**
   * Ghi (Write): Cần XÓA (invalidate) cache
   */
  async create(appointmentData: any): Promise<Appointment> {
    try {
      console.log('appointmentData repository1231231', appointmentData);
      const newAppointment = await this.appointmentModel.create(appointmentData);

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache danh sách
      await this.invalidateAppointmentLists(
        newAppointment.user_id,
        newAppointment.clinic_id,
      );
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return newAppointment;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi cơ sở dữ liệu khi tạo lịch hẹn',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Appointment[]; total: number }> {
    const cacheKey = `appointments:user:${userId}:${page}:${limit}`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.appointmentModel
          .find({ user_id: userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.appointmentModel.countDocuments({ user_id: userId }),
      ]);

      const response = { data, total };

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi lấy danh sách lịch hẹn',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Appointment[]; total: number }> {
    const cacheKey = `appointments:all:${page}:${limit}`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.appointmentModel
          .find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.appointmentModel.countDocuments(),
      ]);

      const response = { data, total };

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi lấy tất cả lịch hẹn',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findByClinicId(
    clinicId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Appointment[]; total: number }> {
    const cacheKey = `appointments:clinic:${clinicId}:${page}:${limit}`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.appointmentModel
          .find({ clinic_id: clinicId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.appointmentModel.countDocuments({ clinic_id: clinicId }),
      ]);

      const response = { data, total };

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi lấy danh sách lịch hẹn theo phòng khám',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findById(id: string): Promise<Appointment | null> {
    const cacheKey = this.getAppointmentKey(id);
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const appointment = await this.appointmentModel.findOne({ id }).lean();

      // 3. Lưu vào Redis (nếu tìm thấy)
      if (appointment) {
        await this.redis.set(cacheKey, JSON.stringify(appointment), {
          EX: this.cacheTTL,
        });
      }

      return appointment;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi tìm lịch hẹn',
      );
    }
  }

  /**
   * Sửa (Update): Cần XÓA (invalidate) cache
   */
  async updateStatus(
    id: string,
    status: string,
    cancelReason?: string,
    cancelledBy?: string,
  ): Promise<Appointment | null> {
    try {
      const updateData: any = { status };

      if (cancelReason !== undefined && cancelReason !== null) {
        updateData.cancel_reason = cancelReason;
      }

      if (cancelledBy !== undefined && cancelledBy !== null) {
        updateData.cancelled_by = cancelledBy;
      }

      const updated = await this.appointmentModel
        .findOneAndUpdate({ id }, updateData, { new: true })
        .lean();

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache
      if (updated) {
        await this.invalidateSingleAppointmentCache(updated.id);
        await this.invalidateAppointmentLists(updated.user_id, updated.clinic_id);
      }
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return updated;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi cập nhật trạng thái lịch hẹn',
      );
    }
  }
}