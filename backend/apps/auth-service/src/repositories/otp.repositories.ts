// src/repositories/otp.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp, OtpDocument, OtpMethod } from '../schemas/otp.schema';
import redisClient from '../common/redis/redis.module';

@Injectable()
export class OtpRepository {
  private redis: typeof redisClient;

  constructor(@InjectModel(Otp.name) private otpModel: Model<OtpDocument>) {
    this.redis = redisClient;
  }

  // ========================================================================
  // SAFE CACHE HELPERS
  // ========================================================================

  private get isRedisReady(): boolean {
    return !!this.redis && (this.redis as any).isOpen === true;
  }

  private getCacheKey(target: string, method: string): string {
    return `otp:${method}:${target}`;
  }

  private async safeCacheSet(
    key: string,
    value: any,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.isRedisReady) return;
    try {
      await this.redis.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
    } catch (err) {
      console.warn(`[Redis SET Ignored] Key: ${key} - Err: ${err.message}`);
    }
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

  private async safeCacheDel(key: string): Promise<void> {
    if (!this.isRedisReady) return;
    try {
      await this.redis.del(key);
    } catch (err) {
      console.warn(`[Redis DEL Ignored] Key: ${key} - Err: ${err.message}`);
    }
  }

  // ========================================================================
  // MAIN METHODS
  // ========================================================================

  async createOtp(
    target: string,
    code: string,
    method: OtpMethod,
    expiresAt: Date,
  ): Promise<OtpDocument> {
    // 1. Tạo trong MongoDB (Persistence)
    const newOtp = await this.otpModel.create({
      target,
      code,
      method,
      expires_at: expiresAt,
    });

    // 2. Tính TTL (Time To Live) theo giây
    const ttl = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);

    // 3. Lưu vào Redis (Cache) nếu TTL hợp lệ (> 0)
    if (ttl > 0) {
      const key = this.getCacheKey(target, method);
      // Lưu object thuần để Redis dễ xử lý
      const cacheData = {
        _id: newOtp._id,
        target,
        code,
        method,
        expires_at: expiresAt,
      };
      await this.safeCacheSet(key, cacheData, ttl);
    }

    return newOtp;
  }

  async deleteExistingOtps(target: string, method: OtpMethod): Promise<any> {
    // 1. Xóa trong Redis trước
    const key = this.getCacheKey(target, method);
    await this.safeCacheDel(key);

    // 2. Xóa trong Mongo
    return this.otpModel.deleteMany({ target, method });
  }

  async findAndVerifyOtp(
    target: string,
    code: string,
    method: OtpMethod,
  ): Promise<OtpDocument | any | null> {
    const key = this.getCacheKey(target, method);

    // --- BƯỚC 1: Kiểm tra Redis (Nhanh nhất) ---
    const cachedOtp = await this.safeCacheGet<any>(key);

    if (cachedOtp) {
      // Redis trả về data, kiểm tra logic nghiệp vụ
      // Redis tự động xóa key khi hết hạn (TTL), nên nếu còn key nghĩa là còn hạn.
      // Tuy nhiên check thêm expires_at cho chắc chắn.
      const isExpired = new Date(cachedOtp.expires_at) < new Date();
      
      if (!isExpired && cachedOtp.code === code) {
        return cachedOtp; // Trả về object từ Redis (Lưu ý: đây là Plain Object, không phải Document)
      }
      // Nếu code sai hoặc hết hạn trong redis (hiếm), ta vẫn để nó fallback xuống DB cho chắc
    }

    // --- BƯỚC 2: Fallback xuống MongoDB (Nếu Redis miss hoặc lỗi) ---
    return this.otpModel
      .findOne({
        target,
        code,
        method,
        expires_at: { $gt: new Date() },
      })
      .sort({ created_at: -1 })
      .lean() // Dùng lean() để trả về plain object giống Redis cho đồng nhất
      .exec();
  }

  async deleteOtp(id: string): Promise<any> {
    // Lưu ý: Hàm này chỉ xóa theo ID nên khó xóa key Redis (vì key Redis theo target).
    // Tuy nhiên, thường thì sau khi Verify xong, service sẽ gọi deleteExistingOtps 
    // hoặc Redis key sẽ tự hết hạn (TTL).
    // Hàm này chủ yếu dùng để dọn dẹp DB thủ công nếu cần.
    
    return this.otpModel.deleteOne({ _id: id });
  }
}