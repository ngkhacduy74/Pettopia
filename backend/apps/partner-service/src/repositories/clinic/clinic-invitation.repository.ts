import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ClinicInvitation,
  ClinicInvitationDocument,
  ClinicInvitationStatus,
} from 'src/schemas/clinic/clinic-invitation.schema';

// --- PHẦN THÊM VÀO ---
// 1. Import Redis client
import redisClient from '../../common/redis/redis.module.js';
// (Hãy đảm bảo đường dẫn import này chính xác với cấu trúc thư mục của bạn)
// --- KẾT THÚC PHẦN THÊM VÀO ---

@Injectable()
export class ClinicInvitationRepository {
  // --- PHẦN THÊM VÀO ---
  // 2. Khai báo redis và thời gian cache (ví dụ: 1 giờ)
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600;
  // --- KẾT THÚC PHẦN THÊM VÀO ---

  constructor(
    @InjectModel(ClinicInvitation.name)
    private readonly invitationModel: Model<ClinicInvitationDocument>,
  ) {
    // --- PHẦN THÊM VÀO ---
    // 3. Khởi tạo redis
    this.redis = redisClient;
    // --- KẾT THÚC PHẦN THÊM VÀO ---
  }

  // --- PHẦN THÊM VÀO: HÀM HELPER CHO CACHE ---

  /**
   * Tạo key cache cho lời mời bằng Token
   */
  private getKeyByToken(token: string): string {
    return `invitation:token:${token}`;
  }

  /**
   * Tạo key cache cho lời mời PENDING (dùng để kiểm tra trùng)
   */
  private getKeyPending(clinic_id: string, email: string): string {
    return `invitation:pending:${clinic_id}:${email}`;
  }

  /**
   * Xóa (invalidate) cache của một lời mời khi nó bị thay đổi
   */
  private async invalidateInvitationCache(
    invitation: ClinicInvitationDocument | ClinicInvitation,
  ) {
    if (!invitation) return;

    if (invitation.token) {
      await this.redis.del(this.getKeyByToken(invitation.token));
    }

    if (invitation.clinic_id && invitation.invited_email) {
      await this.redis.del(
        this.getKeyPending(invitation.clinic_id, invitation.invited_email),
      );
    }
  }
  // --- KẾT THÚC PHẦN THÊM VÀO ---

  /**
   * Ghi (Write): Không cần cache, nhưng cần XÓA cache nếu logic phức tạp.
   * (Trong trường hợp này, hàm create đơn giản nên giữ nguyên)
   */
  async createInvitation(
    invitation: Partial<ClinicInvitation>,
  ): Promise<ClinicInvitation> {
    try {
      const doc = new this.invitationModel(invitation);
      return await doc.save();
      // Chúng ta sẽ không "warm" (làm nóng) cache ở đây
      // vì logic findPendingByClinicAndEmail có kiểm tra 'status'
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException(
          'Đã tồn tại lời mời đang chờ xử lý cho email này.',
        );
      }
      throw new InternalServerErrorException(
        error.message || 'Không thể tạo lời mời phòng khám.',
      );
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findByToken(token: string): Promise<ClinicInvitation | null> {
    const key = this.getKeyByToken(token);

    // 0. Nếu không có redis hoặc client đã đóng -> bỏ qua cache, dùng DB luôn
    if (!this.redis || (this.redis as any).isOpen === false) {
      return this.invitationModel.findOne({ token }).lean().exec();
    }

    let cached: string | null = null;

    // 1. Thử lấy từ Redis (Cache Hit), lỗi Redis thì chỉ warning
    try {
      cached = await this.redis.get(key);
    } catch (err: any) {
      console.warn(
        `Redis GET error in findByToken(${token}), fallback DB only:`,
        err?.message || err,
      );
    }

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.warn('Redis cached data parse error in findByToken, ignore cache:', e);
      }
    }

    // 2. Cache Miss hoặc cache lỗi -> truy vấn MongoDB
    let result: any = null;
    try {
      result = await this.invitationModel.findOne({ token }).lean().exec();
    } catch (err: any) {
      // Chỉ DB lỗi mới trả 500
      throw new InternalServerErrorException(
        err.message || 'Không thể tìm lời mời theo token.',
      );
    }

    // 3. Lưu vào Redis kiểu best-effort, lỗi thì bỏ qua, không ảnh hưởng flow
    if (result) {
      this.redis
        .set(key, JSON.stringify(result), { EX: this.cacheTTL })
        .catch((err: any) => {
          console.warn(
            `Redis SET error in findByToken(${token}), ignore cache:`,
            err?.message || err,
          );
        });
    }

    return result;
  }


  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findPendingByClinicAndEmail(
    clinic_id: string,
    invited_email: string,
  ): Promise<ClinicInvitation | null> {
    const key = this.getKeyPending(clinic_id, invited_email);

    // 0. Nếu không có redis hoặc đã đóng -> bỏ qua cache luôn
    if (!this.redis || (this.redis as any).isOpen === false) {
      // chỉ dùng DB
      return this.invitationModel
        .findOne({
          clinic_id,
          invited_email,
          status: ClinicInvitationStatus.PENDING,
        })
        .lean()
        .exec();
    }

    let cached: string | null = null;

    // 1. Thử lấy từ Redis, lỗi thì CHỈ LOG, KHÔNG THROW
    try {
      cached = await this.redis.get(key);
    } catch (err: any) {
      console.warn(
        `Redis GET error in findPendingByClinicAndEmail(${clinic_id}, ${invited_email}), fallback DB only:`,
        err?.message || err,
      );
    }

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.warn('Redis cached data parse error, ignore cache:', e);
      }
    }

    // 2. Luôn fallback sang DB
    let result: any = null;
    try {
      result = await this.invitationModel
        .findOne({
          clinic_id,
          invited_email,
          status: ClinicInvitationStatus.PENDING,
        })
        .lean()
        .exec();
    } catch (err: any) {
      // CHỈ lỗi DB mới 500
      throw new InternalServerErrorException(
        err.message || 'Không thể tìm lời mời đang chờ.',
      );
    }

    // 3. Lưu cache kiểu best-effort, lỗi thì bỏ qua
    if (result) {
      this.redis
        .set(key, JSON.stringify(result), { EX: this.cacheTTL })
        .catch((err: any) => {
          console.warn(
            `Redis SET error in findPendingByClinicAndEmail(${clinic_id}, ${invited_email}), ignore cache:`,
            err?.message || err,
          );
        });
    }

    return result;
  }


  /**
   * Sửa (Update): Cần XÓA (invalidate) cache
   */
  async markAsAccepted(
    id: string,
    acceptedBy: string,
  ): Promise<ClinicInvitation> {
    try {
      const updated = await this.invitationModel
        .findOneAndUpdate(
          { id },
          {
            $set: {
              status: ClinicInvitationStatus.ACCEPTED,
              accepted_by: acceptedBy,
              accepted_at: new Date(),
            },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException('Không tìm thấy lời mời để cập nhật.');
      }

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache
      await this.invalidateInvitationCache(updated);
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Không thể cập nhật trạng thái lời mời.',
      );
    }
  }

  /**
   * Sửa (Update): Cần XÓA (invalidate) cache
   */
  async markAsDeclined(id: string): Promise<ClinicInvitation> {
    try {
      const updated = await this.invitationModel
        .findOneAndUpdate(
          { id },
          {
            $set: {
              status: ClinicInvitationStatus.DECLINED,
              declined_at: new Date(),
            },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException('Không tìm thấy lời mời để cập nhật.');
      }

      // --- PHẦN THÊM VÀO ---
      // 4. Xóa cache
      await this.invalidateInvitationCache(updated);
      // --- KẾT THÚC PHẦN THÊM VÀO ---

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Không thể cập nhật trạng thái lời mời.',
      );
    }
  }

  /**
   * Sửa (Update): Cần XÓA (invalidate) cache
   * (Sửa lại hàm này để dùng findOneAndUpdate để lấy doc và invalidate)
   */
  async cancelPendingInvitation(id: string): Promise<void> {
    let updated: ClinicInvitation | null = null;

    // 1. Cập nhật trong MongoDB
    try {
      updated = await this.invitationModel.findOneAndUpdate(
        { id, status: ClinicInvitationStatus.PENDING },
        { $set: { status: ClinicInvitationStatus.CANCELLED } },
        { new: true }, // Trả về doc đã cập nhật
      ).exec();
    } catch (error: any) {
      // Chỉ DB lỗi mới trả 500
      throw new InternalServerErrorException(
        error.message || 'Không thể huỷ lời mời.',
      );
    }

    // Không tìm thấy gì để huỷ thì thôi (id sai hoặc không còn pending)
    if (!updated) {
      return;
    }

    // 2. Xóa cache kiểu best-effort: Redis lỗi thì chỉ warn, không throw
    try {
      // Nếu dùng cờ isOpen giống ClinicsRepository:
      if (this.redis && (this.redis as any).isOpen !== false) {
        await this.invalidateInvitationCache(updated);
      }
    } catch (err: any) {
      console.warn(
        '[cancelPendingInvitation] Lỗi khi xóa cache invitation, bỏ qua:',
        err?.message || err,
      );
    }
  }

}