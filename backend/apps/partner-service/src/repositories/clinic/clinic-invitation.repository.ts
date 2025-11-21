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

import redisClient from '../../common/redis/redis.module.js';

@Injectable()
export class ClinicInvitationRepository {
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600;

  constructor(
    @InjectModel(ClinicInvitation.name)
    private readonly invitationModel: Model<ClinicInvitationDocument>,
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

  private getKeyByToken(token: string): string {
    return `invitation:token:${token}`;
  }

  private getKeyPending(clinic_id: string, email: string): string {
    return `invitation:pending:${clinic_id}:${email}`;
  }

  private async invalidateInvitationCache(
    invitation: ClinicInvitationDocument | ClinicInvitation,
  ) {
    if (!invitation) return;

    const keysToDelete: string[] = [];

    if (invitation.token) {
      keysToDelete.push(this.getKeyByToken(invitation.token));
    }

    if (invitation.clinic_id && invitation.invited_email) {
      keysToDelete.push(
        this.getKeyPending(invitation.clinic_id, invitation.invited_email),
      );
    }

    if (keysToDelete.length > 0) {
      await this.safeDel(keysToDelete);
    }
  }

  async createInvitation(
    invitation: Partial<ClinicInvitation>,
  ): Promise<ClinicInvitation> {
    try {
      const doc = new this.invitationModel(invitation);
      return await doc.save();
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

    try {
      const cachedData = await this.safeGet(key);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const result = await this.invitationModel.findOne({ token }).exec();

      if (result) {
        await this.safeSet(key, JSON.stringify(result), {
          EX: this.cacheTTL,
        });
      }

      return result;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Không thể tìm lời mời theo token.',
      );
    }
  }

  async findPendingByClinicAndEmail(
    clinic_id: string,
    invited_email: string,
  ): Promise<ClinicInvitation | null> {
    const key = this.getKeyPending(clinic_id, invited_email);

    try {
      const cachedData = await this.safeGet(key);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const result = await this.invitationModel
        .findOne({
          clinic_id,
          invited_email,
          status: ClinicInvitationStatus.PENDING,
        })
        .exec();

      if (result) {
        await this.safeSet(key, JSON.stringify(result), {
          EX: this.cacheTTL,
        });
      }

      return result;
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Không thể tìm lời mời đang chờ.',
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

      await this.invalidateInvitationCache(updated);

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

      await this.invalidateInvitationCache(updated);

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

  async cancelPendingInvitation(id: string): Promise<void> {
    try {
      const updated = await this.invitationModel.findOneAndUpdate(
        { id, status: ClinicInvitationStatus.PENDING },
        { $set: { status: ClinicInvitationStatus.CANCELLED } },
        { new: true },
      );

      if (updated) {
        await this.invalidateInvitationCache(updated);
      }
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Không thể huỷ lời mời.',
      );
    }
  }
}
