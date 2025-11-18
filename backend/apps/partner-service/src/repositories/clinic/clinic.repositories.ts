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

import redisClient from '../../common/redis/redis.module.js';

@Injectable()
export class ClinicsRepository {
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600;
  private readonly listCacheTTL = 600;

  constructor(
    @InjectModel(Clinic_Register.name)
    private clinicFormModel: Model<ClinicRegisterDocument>,
    @InjectModel(Clinic.name)
    private clinicModel: Model<ClinicDocument>,
  ) {
    this.redis = redisClient;
  }

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

  private getClinicKeyById(id: string): string {
    return `clinic:${id}`;
  }
  private getClinicKeyByEmail(email: string): string {
    return `clinic:email:${email}`;
  }
  private getClinicCountKey(): string {
    return 'clinics:count';
  }

  private async invalidateClinicFormCache(form: ClinicRegisterDocument | null) {
    if (!form) return;
    const keysToDelete: string[] = [];

    if (form.id) keysToDelete.push(this.getFormKeyById(form.id));
    if (form.verification_token)
      keysToDelete.push(this.getFormKeyByToken(form.verification_token));
    if (form.email?.email_address)
      keysToDelete.push(this.getFormKeyExistsEmail(form.email.email_address));
    if (form.phone?.phone_number)
      keysToDelete.push(this.getFormKeyExistsPhone(form.phone.phone_number));
    if (form.license_number)
      keysToDelete.push(this.getFormKeyExistsLicense(form.license_number));
    if (form.representative?.responsible_licenses) {
      for (const license of form.representative.responsible_licenses) {
        keysToDelete.push(this.getFormKeyExistsResponsibleLicense(license));
      }
    }

    if (keysToDelete.length > 0) {
      await this.safeDel(keysToDelete);
    }
  }

  private async invalidateClinicCache(clinic: ClinicDocument | null) {
    if (!clinic) return;
    const keysToDelete: string[] = [];

    if (clinic.id) keysToDelete.push(this.getClinicKeyById(clinic.id));
    if (clinic.email?.email_address)
      keysToDelete.push(this.getClinicKeyByEmail(clinic.email.email_address));

    if (keysToDelete.length > 0) {
      await this.safeDel(keysToDelete);
    }
  }

  private async invalidateListCache(prefix: string) {
    if (!this.redis.isOpen) return;
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
    } catch (err) {}
  }

  private async invalidateClinicFormListCache() {
    await this.invalidateListCache('forms:list');
  }

  private async invalidateClinicListCache() {
    await this.invalidateListCache('clinics:list');
    await this.safeDel(this.getClinicCountKey());
  }

  async createClinicForm(
    data: CreateClinicFormDto,
  ): Promise<ClinicRegisterDocument> {
    try {
      const clinicDocument = new this.clinicFormModel(data);
      const result = await clinicDocument.save();

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
    try {
      const cached = await this.safeGet(key);
      if (cached) return JSON.parse(cached);

      const doc = await this.clinicFormModel
        .findOne({ 'email.email_address': email_address })
        .lean()
        .exec();
      const exists = !!doc;

      await this.safeSet(key, JSON.stringify(exists), { EX: this.cacheTTL });
      return exists;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi kiểm tra trùng email form clinic',
      );
    }
  }

  async existsClinicFormByPhone(phone_number: string): Promise<boolean> {
    const key = this.getFormKeyExistsPhone(phone_number);
    try {
      const cached = await this.safeGet(key);
      if (cached) return JSON.parse(cached);

      const doc = await this.clinicFormModel
        .findOne({ 'phone.phone_number': phone_number })
        .lean()
        .exec();
      const exists = !!doc;

      await this.safeSet(key, JSON.stringify(exists), { EX: this.cacheTTL });
      return exists;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi kiểm tra trùng số điện thoại form clinic',
      );
    }
  }

  async existsClinicFormByLicenseNumber(
    license_number: string,
  ): Promise<boolean> {
    const key = this.getFormKeyExistsLicense(license_number);
    try {
      const cached = await this.safeGet(key);
      if (cached) return JSON.parse(cached);

      const doc = await this.clinicFormModel
        .findOne({ license_number })
        .lean()
        .exec();
      const exists = !!doc;

      await this.safeSet(key, JSON.stringify(exists), { EX: this.cacheTTL });
      return exists;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi kiểm tra trùng số giấy phép form clinic',
      );
    }
  }

  async existsClinicFormByResponsibleLicense(
    license: string,
  ): Promise<boolean> {
    const key = this.getFormKeyExistsResponsibleLicense(license);
    try {
      const cached = await this.safeGet(key);
      if (cached) return JSON.parse(cached);

      const doc = await this.clinicFormModel
        .findOne({ 'representative.responsible_licenses': { $in: [license] } })
        .lean()
        .exec();
      const exists = !!doc;

      await this.safeSet(key, JSON.stringify(exists), { EX: this.cacheTTL });
      return exists;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi kiểm tra trùng giấy phép hành nghề đại diện',
      );
    }
  }

  async findOneClinicForm(id: string): Promise<any> {
    const key = this.getFormKeyById(id);
    try {
      const cached = await this.safeGet(key);
      if (cached) return JSON.parse(cached);

      const findOne = await this.clinicFormModel
        .findOne({ id: id })
        .lean()
        .exec();
      if (!findOne) {
        return null;
      }

      await this.safeSet(key, JSON.stringify(findOne), { EX: this.cacheTTL });
      return findOne;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || `Lỗi cơ sở dữ liệu khi tìm form clinic với ID: ${id}`,
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
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

      const query: any = {};
      if (filters.status) {
        query.status = filters.status;
      }

      const total = await this.clinicFormModel.countDocuments(query);
      const data = await this.clinicFormModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(filters.skip)
        .limit(filters.limit);

      const response = { data, total };

      await this.safeSet(cacheKey, JSON.stringify(response), {
        EX: this.listCacheTTL,
      });
      return response;
    } catch (err) {
      throw new InternalServerErrorException(err.message || 'Lỗi khi tìm form');
    }
  }

  async findByVerificationToken(token: string) {
    const key = this.getFormKeyByToken(token);
    try {
      const cached = await this.safeGet(key);
      if (cached) return JSON.parse(cached);

      const result = await this.clinicFormModel.findOne({
        verification_token: token,
      });

      if (result) {
        await this.safeSet(key, JSON.stringify(result), {
          EX: this.cacheTTL,
        });
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
      {
        new: true,
        runValidators: true,
      },
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

      const result = await this.clinicFormModel.updateOne(
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
        {
          is_active: is_active,
          updatedAt: new Date(),
        },
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
    try {
      const cached = await this.safeGet(cacheKey);
      if (cached) return JSON.parse(cached);

      const clinics = await this.clinicModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      await this.safeSet(cacheKey, JSON.stringify(clinics), {
        EX: this.listCacheTTL,
      });
      return clinics;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi truy vấn danh sách phòng khám',
      );
    }
  }

  async countAllClinic(): Promise<number> {
    const key = this.getClinicCountKey();
    try {
      const cached = await this.safeGet(key);
      if (cached) return JSON.parse(cached);

      const count = await this.clinicModel.countDocuments();

      await this.safeSet(key, JSON.stringify(count), {
        EX: this.listCacheTTL,
      });
      return count;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi đếm tổng số phòng khám',
      );
    }
  }

  async getClinicById(id: string): Promise<any> {
    const key = this.getClinicKeyById(id);
    try {
      const cached = await this.safeGet(key);
      if (cached) return JSON.parse(cached);

      const clinic = await this.clinicModel.findOne({ id: id }).lean().exec();
      if (!clinic) {
        return null;
      }

      await this.safeSet(key, JSON.stringify(clinic), { EX: this.cacheTTL });
      return clinic;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || `Lỗi cơ sở dữ liệu khi tìm phòng khám với ID: ${id}`,
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
    try {
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
    } catch (err) {
      throw err;
    }
  }

  async getClinicByEmail(email: string): Promise<any> {
    const key = this.getClinicKeyByEmail(email);
    try {
      const cached = await this.safeGet(key);
      if (cached) return JSON.parse(cached);

      const clinic = await this.clinicModel
        .findOne({ 'email.email_address': email })
        .lean()
        .exec();

      if (!clinic) {
        return null;
      }

      await this.safeSet(key, JSON.stringify(clinic), { EX: this.cacheTTL });
      return clinic;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message ||
          `Lỗi cơ sở dữ liệu khi tìm phòng khám với email: ${email}`,
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
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'Không thể cập nhật danh sách thành viên phòng khám.',
      );
    }
  }
}
