// src/users/users.repository.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateClinicFormDto } from 'src/dto/clinic/clinic/create-clinic-form.dto';
import { CreateClinicDto } from 'src/dto/clinic/clinic/create-clinic.dto';
import { UpdateClinicFormDto } from 'src/dto/clinic/clinic/update-clinic-form.dto';

import { UpdateStatusClinicDto } from 'src/dto/clinic/clinic/update-status.dto';
import {
  Clinic_Register,
  ClinicRegisterDocument,
  RegisterStatus,
} from 'src/schemas/clinic/clinic-register.schema';
import { Clinic, ClinicDocument } from 'src/schemas/clinic/clinic.schema';

// --- REDIS IMPORT ---
import redisClient from '../../common/redis/redis.module.js';

@Injectable()
export class ClinicsRepository {
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600; // Cache 1 giờ cho các mục đơn lẻ
  private readonly listCacheTTL = 600; // Cache 10 phút cho danh sách

  constructor(
    @InjectModel(Clinic_Register.name)
    private clinicFormModel: Model<ClinicRegisterDocument>,
    @InjectModel(Clinic.name)
    private clinicModel: Model<ClinicDocument>,
  ) {
    this.redis = redisClient;
  }

  private get isRedisReady(): boolean {
    // Kiểm tra biến redis tồn tại VÀ trạng thái kết nối là isOpen
    return !!this.redis && (this.redis as any).isOpen === true;
  }

  private async safeCacheGet<T>(key: string): Promise<T | null> {
    if (!this.isRedisReady) return null;

    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn(
        `[Redis GET Fail] Key: ${key} - Ignore & use DB. Error: ${err.message}`,
      );
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
      console.warn(
        `[Redis SET Fail] Key: ${key} - Ignore. Error: ${err.message}`,
      );
    }
  }

  /**
   * Xóa key Redis an toàn.
   */
  private async safeCacheDel(keys: string | string[]): Promise<void> {
    if (!this.isRedisReady) return;

    try {
      await this.redis.del(keys);
    } catch (err) {
      console.warn(`[Redis DEL Fail] - Ignore. Error: ${err.message}`);
    }
  }

  /**
   * Xóa cache theo prefix (SCAN) an toàn.
   */
  private async safeCacheInvalidatePrefix(prefix: string): Promise<void> {
    if (!this.isRedisReady) return;

    try {
      let cursor = '0';
      do {
        const reply = await this.redis.scan(cursor, {
          MATCH: `${prefix}:*`,
          COUNT: 100,
        });
        cursor = reply.cursor;
        const keys = reply.keys;
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      console.warn(
        `[Redis SCAN/DEL Fail] Prefix: ${prefix} - Ignore. Error: ${err.message}`,
      );
    }
  }

  // ========================================================================
  // KEY GENERATORS
  // ========================================================================

  // Helpers cho Clinic Form
  private getFormKeyById(id: string): string {
    return `form:${id}`;
  }
  private getFormKeyByToken(token: string): string {
    return `form:token:${token}`;
  }
  private getFormKeyExistsEmail(email: string): string {
    return `form:exists:email:${email}`;
  }
  private getFormKeyExistsPhone(phone: string): string {
    return `form:exists:phone:${phone}`;
  }
  private getFormKeyExistsLicense(license: string): string {
    return `form:exists:license:${license}`;
  }
  private getFormKeyExistsResponsibleLicense(license: string): string {
    return `form:exists:resp-license:${license}`;
  }

  // Helpers cho Clinic
  private getClinicKeyById(id: string): string {
    return `clinic:${id}`;
  }
  private getClinicKeyByEmail(email: string): string {
    return `clinic:email:${email}`;
  }
  private getClinicCountKey(): string {
    return 'clinics:count';
  }

  // ========================================================================
  // INVALIDATION LOGIC (SỬ DỤNG SAFE CACHE)
  // ========================================================================

  private async invalidateClinicFormCache(form: ClinicRegisterDocument | null) {
    if (!form) return;
    const keys: string[] = [];

    if (form.id) keys.push(this.getFormKeyById(form.id));
    if (form.verification_token)
      keys.push(this.getFormKeyByToken(form.verification_token));
    if (form.email?.email_address)
      keys.push(this.getFormKeyExistsEmail(form.email.email_address));
    if (form.phone?.phone_number)
      keys.push(this.getFormKeyExistsPhone(form.phone.phone_number));
    if (form.license_number)
      keys.push(this.getFormKeyExistsLicense(form.license_number));
    if (form.representative?.responsible_licenses) {
      form.representative.responsible_licenses.forEach((license) => {
        keys.push(this.getFormKeyExistsResponsibleLicense(license));
      });
    }

    if (keys.length > 0) await this.safeCacheDel(keys);
  }

  private async invalidateClinicCache(clinic: ClinicDocument | null) {
    if (!clinic) return;
    const keys: string[] = [];

    if (clinic.id) keys.push(this.getClinicKeyById(clinic.id));
    if (clinic.email?.email_address)
      keys.push(this.getClinicKeyByEmail(clinic.email.email_address));

    if (keys.length > 0) await this.safeCacheDel(keys);
  }

  private async invalidateClinicFormListCache() {
    await this.safeCacheInvalidatePrefix('forms:list');
  }

  private async invalidateClinicListCache() {
    await this.safeCacheInvalidatePrefix('clinics:list');
    await this.safeCacheDel(this.getClinicCountKey());
  }

  // ========================================================================
  // CLINIC FORM LOGIC
  // ========================================================================

  async createClinicForm(
    data: CreateClinicFormDto,
  ): Promise<ClinicRegisterDocument> {
    try {
      const clinicDocument = new this.clinicFormModel(data);
      const result = await clinicDocument.save();

      // Clear cache danh sách (không cần await để trả về nhanh hơn, hoặc await nếu muốn chắc chắn)
      await this.invalidateClinicFormListCache();

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi tạo form clinic',
      );
    }
  }

  async existsClinicFormByEmail(email_address: string): Promise<boolean> {
    const key = this.getFormKeyExistsEmail(email_address);
    // 1. Safe Get Redis
    const cached = await this.safeCacheGet<boolean>(key);
    if (cached !== null) return cached;

    // 2. Mongo
    const doc = await this.clinicFormModel
      .findOne({ 'email.email_address': email_address })
      .select('_id')
      .lean()
      .exec();
    const exists = !!doc;

    // 3. Safe Set Redis
    await this.safeCacheSet(key, exists);
    return exists;
  }

  async existsClinicFormByPhone(phone_number: string): Promise<boolean> {
    const key = this.getFormKeyExistsPhone(phone_number);
    const cached = await this.safeCacheGet<boolean>(key);
    if (cached !== null) return cached;

    const doc = await this.clinicFormModel
      .findOne({ 'phone.phone_number': phone_number })
      .select('_id')
      .lean()
      .exec();
    const exists = !!doc;

    await this.safeCacheSet(key, exists);
    return exists;
  }

  async existsClinicFormByLicenseNumber(
    license_number: string,
  ): Promise<boolean> {
    const key = this.getFormKeyExistsLicense(license_number);
    const cached = await this.safeCacheGet<boolean>(key);
    if (cached !== null) return cached;

    const doc = await this.clinicFormModel
      .findOne({ license_number })
      .select('_id')
      .lean()
      .exec();
    const exists = !!doc;

    await this.safeCacheSet(key, exists);
    return exists;
  }

  async existsClinicFormByResponsibleLicense(
    license: string,
  ): Promise<boolean> {
    const key = this.getFormKeyExistsResponsibleLicense(license);
    const cached = await this.safeCacheGet<boolean>(key);
    if (cached !== null) return cached;

    const doc = await this.clinicFormModel
      .findOne({ 'representative.responsible_licenses': { $in: [license] } })
      .select('_id')
      .lean()
      .exec();
    const exists = !!doc;

    await this.safeCacheSet(key, exists);
    return exists;
  }

  async findOneClinicForm(id: string): Promise<any> {
    const key = this.getFormKeyById(id);
    const cached = await this.safeCacheGet(key);
    if (cached) return cached;

    try {
      const findOne = await this.clinicFormModel
        .findOne({ id: id })
        .lean()
        .exec();
      if (!findOne) return null;

      await this.safeCacheSet(key, findOne);
      return findOne;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || `Lỗi DB khi tìm form ID: ${id}`,
      );
    }
  }

  async updateStatusClinicForm(
    updateStatus: UpdateStatusClinicDto,
  ): Promise<any> {
    const { id, status, note, review_by } = updateStatus;

    const clinic = await this.clinicFormModel.findOne({ id });
    if (!clinic) {
      throw new NotFoundException(`Không tìm thấy đơn đăng ký với id: ${id}`);
    }

    if (clinic.status !== RegisterStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể cập nhật khi đơn đang ở trạng thái chờ duyệt',
      );
    }

    clinic.status = status;
    clinic.note = note ?? '';
    clinic.review_by = review_by;
    const saved = await clinic.save();

    await this.invalidateClinicFormCache(saved);
    await this.invalidateClinicFormListCache();

    return {
      message: 'Cập nhật trạng thái đơn đăng ký thành công!',
      id: saved.id,
      clinic_name: saved.clinic_name,
      status: saved.status,
      note: saved.note,
      review_by: saved.review_by,
    };
  }

  async findAll(filters: {
    status?: string;
    skip: number;
    limit: number;
  }): Promise<{ data: ClinicRegisterDocument[]; total: number }> {
    const cacheKey = `forms:list:${JSON.stringify(filters)}`;
    const cached = await this.safeCacheGet<{ data: any[]; total: number }>(
      cacheKey,
    );
    if (cached) return cached;

    try {
      const query: any = {};
      if (filters.status) query.status = filters.status;

      const total = await this.clinicFormModel.countDocuments(query);
      const data = await this.clinicFormModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(filters.skip)
        .limit(filters.limit); // Lưu ý: .lean() ở đây sẽ tốt hơn nếu không cần methods của mongoose document

      const response = { data, total };
      await this.safeCacheSet(cacheKey, response, this.listCacheTTL);

      return response;
    } catch (err) {
      throw new InternalServerErrorException(err.message || 'Lỗi khi tìm form');
    }
  }

  async findByVerificationToken(token: string) {
    const key = this.getFormKeyByToken(token);
    const cached = await this.safeCacheGet(key);
    if (cached) return cached;

    try {
      const result = await this.clinicFormModel.findOne({
        verification_token: token,
      }); // Có thể thêm .lean() nếu chỉ đọc
      if (result) {
        await this.safeCacheSet(key, result);
      }
      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi tìm form bằng token',
      );
    }
  }

  async updateClinicForm(id: string, dto: UpdateClinicFormDto): Promise<any> {
    const updatedForm = await this.clinicFormModel.findOneAndUpdate(
      { id: id },
      dto,
      { new: true, runValidators: true },
    );

    if (updatedForm) {
      await this.invalidateClinicFormCache(updatedForm);
      await this.invalidateClinicFormListCache();
    }
    return updatedForm;
  }

  async findClinicByVerificationToken(token: string): Promise<any> {
    return this.findByVerificationToken(token);
  }

  // ========================================================================
  // CLINIC LOGIC (ĐÃ DUYỆT)
  // ========================================================================

  async createClinic(data: CreateClinicDto): Promise<ClinicDocument> {
    try {
      const existClinic = await this.clinicModel.findOne({
        $or: [{ id: data.id }, { license_number: data.license_number }],
      });

      if (existClinic) {
        throw new BadRequestException(
          'Phòng khám với ID hoặc số giấy phép hành nghề này đã tồn tại',
        );
      }

      const newClinic = new this.clinicModel(data);
      const savedClinic = await newClinic.save();

      await this.invalidateClinicListCache();

      return savedClinic;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi tạo phòng khám',
      );
    }
  }

  async rollbackStatusToPending(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const form = await this.clinicFormModel.findOne({ id });

      await this.clinicFormModel.updateOne(
        { id },
        { status: RegisterStatus.PENDING },
      );

      if (form) {
        await this.invalidateClinicFormCache(form);
      }
      await this.invalidateClinicFormListCache();

      return {
        success: true,
        message: `Đã rollback trạng thái đơn ${id} về PENDING thành công.`,
      };
    } catch (err) {
      throw err;
    }
  }

  async updateActiveStatus(id: string, is_active: boolean): Promise<any> {
    const updatedClinic = await this.clinicModel
      .findOneAndUpdate(
        { id: id },
        { is_active: is_active, updatedAt: new Date() },
        { new: true },
      )
      .exec();

    if (updatedClinic) {
      await this.invalidateClinicCache(updatedClinic);
      await this.invalidateClinicListCache();
    }

    return updatedClinic;
  }

  async findAllClinic(skip: number, limit: number): Promise<any> {
    const cacheKey = `clinics:list:${skip}:${limit}`;
    const cached = await this.safeCacheGet(cacheKey);
    if (cached) return cached;

    try {
      const clinics = await this.clinicModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      await this.safeCacheSet(cacheKey, clinics, this.listCacheTTL);
      return clinics;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi DB khi truy vấn danh sách phòng khám',
      );
    }
  }

  async countAllClinic(): Promise<number> {
    const key = this.getClinicCountKey();
    const cached = await this.safeCacheGet<number>(key);
    if (cached !== null) return cached;

    try {
      const count = await this.clinicModel.countDocuments();
      await this.safeCacheSet(key, count, this.listCacheTTL);
      return count;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi DB khi đếm tổng số phòng khám',
      );
    }
  }

  async getClinicById(id: string): Promise<any> {
    const key = this.getClinicKeyById(id);
    const cached = await this.safeCacheGet(key);
    if (cached) return cached;

    try {
      const clinic = await this.clinicModel.findOne({ id }).lean().exec();
      if (!clinic) return null;

      await this.safeCacheSet(key, clinic);
      return clinic;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || `Lỗi DB khi tìm phòng khám ID: ${id}`,
      );
    }
  }

  async updateClinicFormByMail(updateData: any): Promise<any> {
    const { id, ...data } = updateData;

    const clinic = await this.clinicFormModel.findOneAndUpdate(
      { id },
      { $set: data },
      { new: true },
    );

    if (!clinic) {
      throw new NotFoundException(`Không tìm thấy form đăng ký với id: ${id}`);
    }

    await this.invalidateClinicFormCache(clinic);
    await this.invalidateClinicFormListCache();

    return clinic;
  }

  async clearClinicVerificationToken(id: string) {
    const clinic = await this.clinicModel.findById(id);

    const result = await this.clinicModel.updateOne(
      { _id: id },
      { $unset: { verification_token: '', token_expires_at: '' } },
    );

    if (clinic) {
      await this.invalidateClinicCache(clinic);
    }
    return result;
  }

  async updateClinic(id: string, dto: any): Promise<ClinicDocument> {
    const updatedClinic = await this.clinicModel
      .findOneAndUpdate({ id: id }, { $set: dto }, { new: true })
      .exec();

    if (!updatedClinic) {
      throw new NotFoundException(
        `Không tìm thấy phòng khám với id: ${id} để cập nhật`,
      );
    }

    await this.invalidateClinicCache(updatedClinic);
    await this.invalidateClinicListCache();

    return updatedClinic;
  }

  async getClinicByEmail(email: string): Promise<any> {
    const key = this.getClinicKeyByEmail(email);
    const cached = await this.safeCacheGet(key);
    if (cached) return cached;

    try {
      const clinic = await this.clinicModel
        .findOne({ 'email.email_address': email })
        .lean()
        .exec();
      if (!clinic) return null;

      await this.safeCacheSet(key, clinic);
      return clinic;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || `Lỗi DB khi tìm phòng khám email: ${email}`,
      );
    }
  }

  async addMemberToClinic(
    clinicId: string,
    memberId: string,
  ): Promise<ClinicDocument> {
    try {
      const updatedClinic = await this.clinicModel
        .findOneAndUpdate(
          { id: clinicId },
          {
            $addToSet: { member_ids: memberId },
            $set: { updatedAt: new Date() },
          },
          { new: true },
        )
        .exec();

      if (!updatedClinic) {
        throw new NotFoundException(
          `Không tìm thấy phòng khám với id: ${clinicId}`,
        );
      }

      await this.invalidateClinicCache(updatedClinic);
      return updatedClinic;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Không thể cập nhật danh sách thành viên phòng khám.',
      );
    }
  }
}
