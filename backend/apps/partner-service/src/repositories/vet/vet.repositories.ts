import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateVetDto } from 'src/dto/vet/create-vet.dto';
import { UpdateStatusVetDto } from 'src/dto/vet/update-vet-form';
import { VetRegisterDto } from 'src/dto/vet/vet-register-form';
import {
  Vet_Register,
  VetRegisterDocument,
} from 'src/schemas/vet/vet-register.schema';
import { Vet, VetDocument } from 'src/schemas/vet/vet.schema';
import { v4 as uuidv4 } from 'uuid';

import redisClient from '../../common/redis/redis.module.js';
import { RegisterStatus } from 'src/schemas/clinic/clinic-register.schema.js';

@Injectable()
export class VetRepository {
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600;
  private readonly listCacheTTL = 600;

  constructor(
    @InjectModel(Vet_Register.name)
    private vetFormModel: Model<VetRegisterDocument>,
    @InjectModel(Vet.name)
    private vetModel: Model<VetDocument>,
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

  private getVetKey(id: string): string {
    return `vet:${id}`;
  }

  private getVetFormKey(id: string): string {
    return `vetform:${id}`;
  }

  private getVetFormLicenseKey(license: string): string {
    return `vetform:license:${license}`;
  }

  private async invalidateVetCache(id: string) {
    if (id) {
      await this.safeDel(this.getVetKey(id));
    }
  }

  private async invalidateVetFormCache(form: VetRegisterDocument | any) {
    if (!form) return;
    const keysToDelete: string[] = [];

    if (form.id) keysToDelete.push(this.getVetFormKey(form.id));
    if (form.license_number)
      keysToDelete.push(this.getVetFormLicenseKey(form.license_number));

    if (keysToDelete.length > 0) {
      await this.safeDel(keysToDelete);
    }
  }

  private async invalidateVetFormListCache() {
    if (!this.redis.isOpen) return;
    try {
      await this.safeDel('vetforms:count');
      let cursor = '0';
      do {
        const reply = await this.redis.scan(cursor, {
          MATCH: 'vetforms:list:*',
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

  async findVetById(user_id: string): Promise<any | null> {
    const cacheKey = this.getVetKey(user_id);
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const vet = await this.vetModel.findOne({ id: user_id }).exec();

      if (!vet) {
        return null;
      }

      await this.safeSet(cacheKey, JSON.stringify(vet), {
        EX: this.cacheTTL,
      });

      return vet;
    } catch (err) {
      throw new InternalServerErrorException(
        'Không thể truy vấn thông tin bác sĩ',
      );
    }
  }

  async findOneVetByFormId(formId: string): Promise<VetDocument | null> {
    const cacheKey = `vet:form:${formId}`;
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const vet = await this.vetModel.findOne({ vet_form_id: formId }).exec();

      if (vet) {
        await this.safeSet(cacheKey, JSON.stringify(vet), {
          EX: this.cacheTTL,
        });
      }
      return vet;
    } catch (err) {
      throw new InternalServerErrorException('Không thể truy vấn bác sĩ.');
    }
  }

  async create(vetRegisterData: VetRegisterDto, user_id: string): Promise<any> {
    try {
      const newVet = new this.vetFormModel({
        id: uuidv4(),
        ...vetRegisterData,
        user_id: user_id,
      });
      const result = await newVet.save();

      await this.invalidateVetFormListCache();

      return result;
    } catch (err) {
      throw new InternalServerErrorException('Không thể tạo bác sĩ mới');
    }
  }

  async createVet(newVetData: CreateVetDto): Promise<VetDocument> {
    try {
      const newVet = new this.vetModel({
        ...newVetData,
      });

      return await newVet.save();
    } catch (err) {
      throw new InternalServerErrorException('Không thể tạo bác sĩ mới');
    }
  }

  async updateVetFormStatus(body: UpdateStatusVetDto): Promise<any> {
    try {
      const { id, status, note, review_by } = body;
      const vetForm = await this.vetFormModel.findOne({ id: id }).exec();

      if (!vetForm) {
        return null;
      }

      vetForm.status = status;
      vetForm.note = note ?? '';
      vetForm.review_by = review_by;

      const updatedVetForm = await vetForm.save();

      await this.invalidateVetFormCache(updatedVetForm);
      await this.invalidateVetFormListCache();

      return updatedVetForm;
    } catch (err) {
      throw new InternalServerErrorException(
        'Không thể cập nhật trạng thái hồ sơ bác sĩ.',
      );
    }
  }

  async findAllVetForms(
    skip: number,
    limit: number,
    filter: any = {},
  ): Promise<any[]> {
    const cacheKey = `vetforms:list:${JSON.stringify(filter)}:${skip}:${limit}`;
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await this.vetFormModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      await this.safeSet(cacheKey, JSON.stringify(result), {
        EX: this.listCacheTTL,
      });

      return result;
    } catch (err) {
      throw new InternalServerErrorException('Lỗi khi lấy danh sách form');
    }
  }

  async countVetForms(filter: any = {}): Promise<number> {
    const cacheKey = `vetforms:count:${JSON.stringify(filter)}`;
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const count = await this.vetFormModel.countDocuments(filter).exec();

      await this.safeSet(cacheKey, JSON.stringify(count), {
        EX: this.listCacheTTL,
      });

      return count;
    } catch (err) {
      throw new InternalServerErrorException('Lỗi khi đếm form');
    }
  }

  async rollBackStatusVetForm(
    id: string,
    previousStatus: RegisterStatus,
  ): Promise<any> {
    try {
      const vetForm = await this.vetFormModel.findOne({ id }).exec();

      if (!vetForm) {
        return null;
      }
      vetForm.status = previousStatus;
      vetForm.note = `[ROLLBACK] Trạng thái đã được hoàn tác về ${previousStatus} vào ${new Date().toLocaleString()}`;

      const savedForm = await vetForm.save();

      await this.invalidateVetFormCache(savedForm);
      await this.invalidateVetFormListCache();

      return savedForm;
    } catch (err) {
      throw new InternalServerErrorException(
        'Không thể rollback trạng thái hồ sơ bác sĩ.',
      );
    }
  }

  async findVetFormByLicenseNumber(license_number: string): Promise<any> {
    if (!license_number || typeof license_number !== 'string') {
      throw new BadRequestException('Số giấy phép hành nghề không hợp lệ.');
    }

    const cacheKey = this.getVetFormLicenseKey(license_number);
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const existingForm = await this.vetFormModel
        .findOne({ license_number })
        .lean()
        .exec();

      const result = existingForm || null;

      await this.safeSet(cacheKey, JSON.stringify(result), {
        EX: this.cacheTTL,
      });

      return result;
    } catch {
      throw new InternalServerErrorException(
        'Không thể kiểm tra số giấy phép hành nghề.',
      );
    }
  }

  async addClinicToVet(
    vetId: string,
    clinicId: string,
    role?: string,
  ): Promise<VetDocument> {
    try {
      const updateData: any = {
        $addToSet: { clinic_id: clinicId },
        $set: { updatedAt: new Date() },
      };

      // Nếu có role, thêm vào clinic_roles
      if (role) {
        updateData.$push = {
          clinic_roles: {
            clinic_id: clinicId,
            role: role,
            joined_at: new Date(),
          },
        };
      }

      const updatedVet = await this.vetModel
        .findOneAndUpdate({ id: vetId }, updateData, { new: true })
        .exec();

      if (!updatedVet) {
        throw new NotFoundException(
          `Không tìm thấy hồ sơ bác sĩ với id: ${vetId}`,
        );
      }

      await this.invalidateVetCache(vetId);

      return updatedVet;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        error.message || 'Không thể cập nhật danh sách phòng khám của bác sĩ.',
      );
    }
  }
}
