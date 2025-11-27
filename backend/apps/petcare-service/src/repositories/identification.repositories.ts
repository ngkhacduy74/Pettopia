import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Identification,
  IdentificationDocument,
} from 'src/schemas/identification.schema';
import { RpcException } from '@nestjs/microservices';

import redisClient from '../common/redis/redis.module.js';

@Injectable()
export class IdentificationRepository {
  private redis = redisClient;
  private readonly cacheTTL = 3600;

  constructor(
    @InjectModel(Identification.name)
    private identificationModel: Model<IdentificationDocument>,
  ) {}

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

  private getKeyByPetId(pet_id: string): string {
    return `identification:pet:${pet_id}`;
  }

  private getKeyByIdentify(id_identify: string): string {
    return `identification:id:${id_identify}`;
  }

  private async invalidateCache(pet_id: string, identification_id: string) {
    const keys: string[] = [];

    if (pet_id) keys.push(this.getKeyByPetId(pet_id));
    if (identification_id) keys.push(this.getKeyByIdentify(identification_id));

    if (keys.length) await this.safeDel(keys);
  }

  async create(data: any): Promise<any> {
    try {
      const saved = await this.identificationModel.create(data);

      if (saved) {
        if (saved.pet_id) {
          await this.safeSet(
            this.getKeyByPetId(saved.pet_id),
            JSON.stringify(saved),
            { EX: this.cacheTTL },
          );
        }

        if (saved.identification_id) {
          await this.safeSet(
            this.getKeyByIdentify(saved.identification_id),
            JSON.stringify(saved),
            { EX: this.cacheTTL },
          );
        }
      }

      return saved;
    } catch (err) {
      throw new RpcException(err.message || 'Không thể lưu identification');
    }
  }

  async findByPetId(pet_id: string): Promise<Identification | null> {
    const cacheKey = this.getKeyByPetId(pet_id);

    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

      const result = await this.identificationModel.findOne({ pet_id }).lean();

      if (result) {
        await this.safeSet(cacheKey, JSON.stringify(result), {
          EX: this.cacheTTL,
        });
      }

      return result;
    } catch (err) {
      throw new RpcException(
        err.message || 'Không thể tìm identification theo pet_id',
      );
    }
  }

  async updateByPetId(
    pet_id: string,
    updateData: any,
  ): Promise<Identification | null> {
    try {
      const oldDoc = await this.identificationModel.findOne({ pet_id }).lean();

      const updated = await this.identificationModel.findOneAndUpdate(
        { pet_id },
        updateData,
        { new: true },
      );

      if (oldDoc) {
        await this.invalidateCache(oldDoc.pet_id, oldDoc.identification_id);
      }

      if (updated) {
        await this.invalidateCache(updated.pet_id, updated.identification_id);
      }

      return updated;
    } catch (err) {
      throw new RpcException(
        err.message || 'Không thể cập nhật identification theo pet_id',
      );
    }
  }

  async checkIdExist(id_identify: string): Promise<Identification | null> {
    const cacheKey = this.getKeyByIdentify(id_identify);

    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

      const result = await this.identificationModel
        .findOne({ identification_id: id_identify })
        .lean();

      if (result) {
        await this.safeSet(cacheKey, JSON.stringify(result), {
          EX: this.cacheTTL,
        });
      }

      return result;
    } catch (err) {
      throw new RpcException(err.message || 'Không thể check identification');
    }
  }

  async deleteByPetId(pet_id: string): Promise<boolean> {
    const docToDelete = await this.identificationModel
      .findOne({ pet_id })
      .lean();

    const result = await this.identificationModel.deleteOne({ pet_id });

    if (result.deletedCount > 0 && docToDelete) {
      await this.invalidateCache(
        docToDelete.pet_id,
        docToDelete.identification_id,
      );
    }

    return result.deletedCount > 0;
  }
}
