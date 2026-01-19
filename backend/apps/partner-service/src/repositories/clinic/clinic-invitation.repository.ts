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

// --- REDIS IMPORT ---
import redisClient from '../../common/redis/redis.module';

@Injectable()
export class ClinicInvitationRepository {
  private redis: typeof redisClient;
  private readonly cacheTTL = 1800; // Cache 30 phút (Lời mời thường không thay đổi liên tục)

  constructor(
    @InjectModel(ClinicInvitation.name)
    private readonly invitationModel: Model<ClinicInvitationDocument>,
  ) {
    this.redis = redisClient;
  }

  // ========================================================================
  // SAFE CACHE HELPERS (FAIL-SAFE)
  // ========================================================================

  private get isRedisReady(): boolean {
    return !!this.redis && (this.redis as any).isOpen === true;
  }

  private async safeCacheGet<T>(key: string): Promise<T | null> {
    if (!this.isRedisReady) return null;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn(`[Redis GET Ignored] Key: ${key} - Err: ${err.message}`);
      return null; // Trả về null để fallback xuống Mongo
    }
  }

  private async safeCacheSet(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isRedisReady) return;
    try {
      await this.redis.set(key, JSON.stringify(value), {
        EX: ttl || this.cacheTTL,
      });
    } catch (err) {
      console.warn(`[Redis SET Ignored] Key: ${key} - Err: ${err.message}`);
    }
  }

  private async safeCacheDel(keys: string | string[]): Promise<void> {
    if (!this.isRedisReady) return;
    try {
      await this.redis.del(keys);
    } catch (err) {
      console.warn(`[Redis DEL Ignored] Err: ${err.message}`);
    }
  }

  // ========================================================================
  // KEY GENERATORS
  // ========================================================================

  private getKeyByToken(token: string): string {
    return `invitation:token:${token}`;
  }

  private getKeyByPendingEmail(clinicId: string, email: string): string {
    return `invitation:pending:${clinicId}:${email}`;
  }

  /**
   * Xóa cache liên quan đến lời mời này
   */
  private async invalidateInvitationCache(invitation: ClinicInvitationDocument | ClinicInvitation | null) {
    if (!invitation) return;
    const keys: string[] = [];

    // Xóa cache theo token
    if (invitation.token) {
      keys.push(this.getKeyByToken(invitation.token));
    }

    // Xóa cache theo pending email (nếu có đủ thông tin)
    if (invitation.clinic_id && invitation.invited_email) {
      keys.push(this.getKeyByPendingEmail(invitation.clinic_id, invitation.invited_email));
    }

    if (keys.length > 0) {
      await this.safeCacheDel(keys);
    }
  }

  // ========================================================================
  // MAIN METHODS
  // ========================================================================

  async createInvitation(
    invitation: Partial<ClinicInvitation>,
  ): Promise<ClinicInvitation> {
    try {
      const doc = new this.invitationModel(invitation);
      const saved = await doc.save();

      // Mặc dù mới tạo chưa có cache để xóa, nhưng gọi hàm này để clear
      // các key tiềm năng nếu logic nghiệp vụ phức tạp hơn sau này.
      // Đặc biệt là key 'pending' nếu trước đó đã có cache 'null'.
      await this.invalidateInvitationCache(saved);

      return saved;
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

  async findByToken(token: string): Promise<ClinicInvitation | null> {
    const key = this.getKeyByToken(token);

    // 1. Try Redis
    const cached = await this.safeCacheGet<ClinicInvitation>(key);
    if (cached) return cached;

    try {
      // 2. Try Mongo
      const result = await this.invitationModel.findOne({ token }).lean().exec();

      // 3. Save Redis if found
      if (result) {
        await this.safeCacheSet(key, result);
      }
      return result;
    } catch (err: any) {
      throw new InternalServerErrorException(
        err.message || 'Không thể tìm lời mời theo token.',
      );
    }
  }

  async findPendingByClinicAndEmail(
    clinic_id: string,
    invited_email: string,
  ): Promise<ClinicInvitation | null> {
    const key = this.getKeyByPendingEmail(clinic_id, invited_email);

    // 1. Try Redis
    const cached = await this.safeCacheGet<ClinicInvitation>(key);
    if (cached) return cached;

    try {
      // 2. Try Mongo
      const result = await this.invitationModel
        .findOne({
          clinic_id,
          invited_email,
          status: ClinicInvitationStatus.PENDING,
        })
        .lean()
        .exec();

      // 3. Save Redis if found
      if (result) {
        await this.safeCacheSet(key, result);
      }
      return result;
    } catch (err: any) {
      throw new InternalServerErrorException(
        err.message || 'Không thể tìm lời mời đang chờ.',
      );
    }
  }

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

      // Xóa cache cũ vì trạng thái đã thay đổi
      await this.invalidateInvitationCache(updated);

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      throw new InternalServerErrorException(
        error.message || 'Không thể cập nhật trạng thái lời mời.',
      );
    }
  }

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

      // Xóa cache cũ
      await this.invalidateInvitationCache(updated);

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      throw new InternalServerErrorException(
        error.message || 'Không thể cập nhật trạng thái lời mời.',
      );
    }
  }

  async cancelPendingInvitation(id: string): Promise<void> {
    try {
      const updated = await this.invitationModel
        .findOneAndUpdate(
          { id, status: ClinicInvitationStatus.PENDING },
          { $set: { status: ClinicInvitationStatus.CANCELLED } },
          { new: true } // Cần lấy bản ghi mới để biết thông tin mà xóa cache
        )
        .exec();
      
      if (updated) {
        await this.invalidateInvitationCache(updated);
      }
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Không thể huỷ lời mời.',
      );
    }
  }
}