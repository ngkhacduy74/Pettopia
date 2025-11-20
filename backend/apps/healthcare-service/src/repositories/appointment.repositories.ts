import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Appointment, AppointmentDocument } from '../schemas/appoinment.schema';
import redisClient from '../common/redis/redis.module.js';

@Injectable()
export class AppointmentRepository {
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600;
  private readonly listCacheTTL = 600;

  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
  ) {
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

  private getAppointmentKey(id: string): string {
    return `appointment:${id}`;
  }

  private async invalidateSingleAppointmentCache(id: string) {
    if (id) {
      await this.safeDel(this.getAppointmentKey(id));
    }
  }

  private async invalidateAppointmentLists(userId?: string, clinicId?: string) {
    // Nếu Redis chưa kết nối thì bỏ qua ngay lập tức để tránh lỗi SCAN
    if (!this.redis.isOpen) return;

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
            await this.redis.del(keys);
          }
        } while (cursor !== '0');
      }
    } catch (err) {
      // Log lỗi nhưng không throw để flow chính vẫn chạy
      console.error('Lỗi khi invalidating appointment lists:', err);
    }
  }

  async create(appointmentData: any): Promise<Appointment> {
    try {
      const newAppointment =
        await this.appointmentModel.create(appointmentData);

      await this.invalidateAppointmentLists(
        newAppointment.user_id,
        newAppointment.clinic_id,
      );

      return newAppointment;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi cơ sở dữ liệu khi tạo lịch hẹn',
      );
    }
  }

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Appointment[]; total: number }> {
    const cacheKey = `appointments:user:${userId}:${page}:${limit}`;
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

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

      await this.safeSet(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi lấy danh sách lịch hẹn',
      );
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Appointment[]; total: number }> {
    const cacheKey = `appointments:all:${page}:${limit}`;
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

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

      await this.safeSet(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi lấy tất cả lịch hẹn',
      );
    }
  }

  async findByClinicId(
    clinicId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Appointment[]; total: number }> {
    const cacheKey = `appointments:clinic:${clinicId}:${page}:${limit}`;
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

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

      await this.safeSet(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });

      return response;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi lấy danh sách lịch hẹn theo phòng khám',
      );
    }
  }

  async findById(id: string): Promise<Appointment | null> {
    const cacheKey = this.getAppointmentKey(id);
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const appointment = await this.appointmentModel.findOne({ id }).lean();

      if (appointment) {
        await this.safeSet(cacheKey, JSON.stringify(appointment), {
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

      if (updated) {
        await this.invalidateSingleAppointmentCache(updated.id);
        await this.invalidateAppointmentLists(
          updated.user_id,
          updated.clinic_id,
        );
      }

      return updated;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi cập nhật trạng thái lịch hẹn',
      );
    }
  }

  /**
   * Cập nhật thông tin lịch hẹn (generic update - không giới hạn field)
   */
  async update(
    id: string,
    updateData: Partial<Appointment>,
  ): Promise<Appointment | null> {
    try {
      const updated = await this.appointmentModel
        .findOneAndUpdate({ id }, updateData, { new: true })
        .lean();

      if (updated) {
        await this.invalidateSingleAppointmentCache(updated.id);
        await this.invalidateAppointmentLists(
          updated.user_id,
          updated.clinic_id,
        );
      }

      return updated;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi cập nhật lịch hẹn',
      );
    }
  }

  /**
   * Xóa lịch hẹn
   */
  async remove(id: string): Promise<Appointment | null> {
    try {
      const appointment = await this.appointmentModel
        .findOneAndDelete({ id })
        .lean();

      if (appointment) {
        await this.invalidateSingleAppointmentCache(appointment.id);
        await this.invalidateAppointmentLists(
          appointment.user_id,
          appointment.clinic_id,
        );
      }

      return appointment;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi xóa lịch hẹn',
      );
    }
  }
}
