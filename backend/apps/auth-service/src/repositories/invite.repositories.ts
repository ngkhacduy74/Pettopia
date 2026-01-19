import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VetInviteToken,
  VetInviteTokenDocument,
  VetInviteTokenStatus,
} from 'src/schemas/vet.inviteToken';
import { v4 as uuidv4 } from 'uuid';

// --- REDIS IMPORT ---
import redisClient from '../common/redis/redis.module';

@Injectable()
export class VetInviteRepository {
  private redis: typeof redisClient;
  private readonly cacheTTL = 900; // Cache 15 phút

  constructor(
    @InjectModel(VetInviteToken.name)
    private readonly inviteModel: Model<VetInviteTokenDocument>,
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
      return null;
    }
  }

  private async safeCacheSet(
    key: string,
    value: any,
    ttl?: number,
  ): Promise<void> {
    if (!this.isRedisReady) return;
    try {
      await this.redis.set(key, JSON.stringify(value), {
        EX: ttl || this.cacheTTL,
      });
    } catch (err) {
      console.warn(`[Redis SET Ignored] Key: ${key} - Err: ${err.message}`);
    }
  }

  private async safeCacheDel(key: string): Promise<void> {
    if (!this.isRedisReady) return;
    try {
      await this.redis.del(key);
    } catch (err) {
      console.warn(`[Redis DEL Ignored] Err: ${err.message}`);
    }
  }

  // ========================================================================
  // KEY GENERATORS
  // ========================================================================

  private getTokenKey(token: string): string {
    return `vet_invite:token:${token}`;
  }

  // ========================================================================
  // MAIN METHODS
  // ========================================================================

  async createInvite(
    email: string,
    clinicId: string,
    token: string,
    expiresAt: Date,
  ) {
    // Xóa các invite cũ của email này trong DB
    await this.inviteModel.deleteMany({ email });

    // Lưu invite mới
    const newInvite = await this.inviteModel.create({
      id: uuidv4(),
      email,
      token,
      clinic_id: clinicId,
      status: VetInviteTokenStatus.PENDING,
      expires_at: expiresAt,
    });

    // Option: Có thể cache luôn token này để lần đọc tiếp theo nhanh hơn
    await this.safeCacheSet(this.getTokenKey(token), newInvite);

    return newInvite;
  }

  async findByToken(token: string) {
    const key = this.getTokenKey(token);

    // 1. Thử lấy từ Redis
    const cached = await this.safeCacheGet(key);
    if (cached) return cached;

    // 2. Nếu không có, lấy từ Mongo (dùng .lean() để trả về plain object giống Redis)
    const invite = await this.inviteModel.findOne({ token: token }).lean().exec();

    // 3. Nếu tìm thấy, lưu vào Redis
    if (invite) {
      await this.safeCacheSet(key, invite);
    }

    return invite;
  }

  async markAsAccepted(invite: VetInviteTokenDocument | any) {
    // Sử dụng findOneAndUpdate để an toàn dù 'invite' là Document hay JSON từ Redis
    const updatedInvite = await this.inviteModel
      .findOneAndUpdate(
        { _id: invite._id }, // Tìm theo _id của object truyền vào
        { $set: { status: VetInviteTokenStatus.ACCEPTED } },
        { new: true },
      )
      .exec();

    // Xóa cache của token này để lần sau query sẽ ra trạng thái mới (ACCEPTED)
    if (updatedInvite && updatedInvite.token) {
      await this.safeCacheDel(this.getTokenKey(updatedInvite.token));
    }

    return updatedInvite;
  }
}