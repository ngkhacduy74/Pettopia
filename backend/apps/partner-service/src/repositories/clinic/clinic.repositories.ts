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

// --- PHẦN THÊM VÀO ---
import redisClient from '../../common/redis/redis.module.js';
// (Hãy đảm bảo đường dẫn import này chính xác với cấu trúc thư mục của bạn)
// --- KẾT THÚC PHẦN THÊM VÀO ---

@Injectable()
export class ClinicsRepository {
  // --- PHẦN THÊM VÀO ---
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600; // Cache 1 giờ cho các mục đơn lẻ
  private readonly listCacheTTL = 600; // Cache 10 phút cho danh sách
  // --- KẾT THÚC PHẦN THÊM VÀO ---

  constructor(
    @InjectModel(Clinic_Register.name)
    private clinicFormModel: Model<ClinicRegisterDocument>,
    @InjectModel(Clinic.name)
    private clinicModel: Model<ClinicDocument>,
  ) {
    // --- PHẦN THÊM VÀO ---
    this.redis = redisClient;
    // --- KẾT THÚC PHẦN THÊM VÀO ---
  }

  // --- PHẦN THÊM VÀO: HELPERS QUẢN LÝ CACHE ---

  // --- Helpers cho Clinic Form (Đơn đăng ký) ---
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

  // --- Helpers cho Clinic (Đã duyệt) ---
  private getClinicKeyById(id: string): string {
    return `clinic:${id}`;
  }
  private getClinicKeyByEmail(email: string): string {
    return `clinic:email:${email}`;
  }
  private getClinicCountKey(): string {
    return 'clinics:count';
  }

  /**
   * Xóa cache cho một Clinic Form cụ thể (invalidate)
   */
  private async invalidateClinicFormCache(
    form: ClinicRegisterDocument | null,
  ) {
    if (!form) return;
    try {
      if (form.id) await this.redis.del(this.getFormKeyById(form.id));
      if (form.verification_token)
        await this.redis.del(this.getFormKeyByToken(form.verification_token));
      if (form.email?.email_address)
        await this.redis.del(
          this.getFormKeyExistsEmail(form.email.email_address),
        );
      if (form.phone?.phone_number)
        await this.redis.del(
          this.getFormKeyExistsPhone(form.phone.phone_number),
        );
      if (form.license_number)
        await this.redis.del(this.getFormKeyExistsLicense(form.license_number));
      if (form.representative?.responsible_licenses) {
        for (const license of form.representative.responsible_licenses) {
          await this.redis.del(this.getFormKeyExistsResponsibleLicense(license));
        }
      }
    } catch (err) {
      console.error('Lỗi khi xóa cache clinic form:', err);
    }
  }

  /**
   * Xóa cache cho một Clinic cụ thể (invalidate)
   */
  private async invalidateClinicCache(clinic: ClinicDocument | null) {
    if (!clinic) return;
    try {
      if (clinic.id) await this.redis.del(this.getClinicKeyById(clinic.id));
      if (clinic.email?.email_address)
        await this.redis.del(
          this.getClinicKeyByEmail(clinic.email.email_address),
        );
    } catch (err) {
      console.error('Lỗi khi xóa cache clinic:', err);
    }
  }

  /**
   * Xóa cache danh sách (dùng SCAN, an toàn, không block Redis)
   */
  private async invalidateListCache(prefix: string) {
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
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      console.error(`Lỗi khi xóa cache với prefix ${prefix}:`, err);
    }
  }

  // Hàm gọi tắt để xóa cache danh sách form
  private async invalidateClinicFormListCache() {
    await this.invalidateListCache('forms:list');
  }

  // Hàm gọi tắt để xóa cache danh sách clinic
  private async invalidateClinicListCache() {
    await this.invalidateListCache('clinics:list');
    await this.redis.del(this.getClinicCountKey()); // Cũng xóa cache đếm
  }
  // --- KẾT THÚC PHẦN HELPERS ---

  //
  // --- PHẦN LOGIC CỦA CLINIC FORM ---
  //

  async createClinicForm(
    data: CreateClinicFormDto,
  ): Promise<ClinicRegisterDocument> {
    try {
      const clinicDocument = new this.clinicFormModel(data);
      const result = await clinicDocument.save();

      // Invalidate cache danh sách form
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
      // 1. Thử lấy từ Redis
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);

      // 2. Cache Miss -> Lấy từ MongoDB
      const doc = await this.clinicFormModel
        .findOne({ 'email.email_address': email_address })
        .lean()
        .exec();
      const exists = !!doc;

      // 3. Lưu vào Redis
      await this.redis.set(key, JSON.stringify(exists), { EX: this.cacheTTL });
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
      // 1. Thử lấy từ Redis
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);

      // 2. Cache Miss
      const doc = await this.clinicFormModel
        .findOne({ 'phone.phone_number': phone_number })
        .lean()
        .exec();
      const exists = !!doc;

      // 3. Lưu vào Redis
      await this.redis.set(key, JSON.stringify(exists), { EX: this.cacheTTL });
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
      // 1. Thử lấy từ Redis
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);

      // 2. Cache Miss
      const doc = await this.clinicFormModel
        .findOne({ license_number })
        .lean()
        .exec();
      const exists = !!doc;

      // 3. Lưu vào Redis
      await this.redis.set(key, JSON.stringify(exists), { EX: this.cacheTTL });
      return exists;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi kiểm tra trùng số giấy phép form clinic',
      );
    }
  }

  async existsClinicFormByResponsibleLicense(license: string): Promise<boolean> {
    const key = this.getFormKeyExistsResponsibleLicense(license);
    try {
      // 1. Thử lấy từ Redis
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);

      // 2. Cache Miss
      const doc = await this.clinicFormModel
        .findOne({ 'representative.responsible_licenses': { $in: [license] } })
        .lean()
        .exec();
      const exists = !!doc;

      // 3. Lưu vào Redis
      await this.redis.set(key, JSON.stringify(exists), { EX: this.cacheTTL });
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
      // 1. Thử lấy từ Redis
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);

      // 2. Cache Miss
      const findOne = await this.clinicFormModel
        .findOne({ id: id })
        .lean()
        .exec();
      if (!findOne) {
        return null;
      }

      // 3. Lưu vào Redis
      await this.redis.set(key, JSON.stringify(findOne), { EX: this.cacheTTL });
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

    // Invalidate cache
    await this.invalidateClinicFormCache(saved);
    await this.invalidateClinicFormListCache(); // Xóa cache danh sách

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
      // 1. Thử lấy từ Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      // 2. Cache Miss
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

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(response), {
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
      // 1. Thử lấy từ Redis
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);

      // 2. Cache Miss
      const result = await this.clinicFormModel.findOne({
        verification_token: token,
      });

      // 3. Lưu vào Redis
      // (Lưu ý: không dùng .lean(), nên JSON.stringify(result) sẽ ổn)
      if (result) {
        await this.redis.set(key, JSON.stringify(result), {
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

  async updateClinicForm(
    id: string,
    dto: UpdateClinicFormDto,
  ): Promise<any> {
    const updatedForm = await this.clinicFormModel.findOneAndUpdate(
      { id: id },
      dto,
      {
        new: true,
        runValidators: true,
      },
    );

    // Invalidate cache
    if (updatedForm) {
      await this.invalidateClinicFormCache(updatedForm);
      await this.invalidateClinicFormListCache();
    }
    return updatedForm;
  }

  // (Hàm này trùng với findByVerificationToken, nhưng vẫn giữ logic cache)
  async findClinicByVerificationToken(token: string): Promise<any> {
    return this.findByVerificationToken(token);
  }

  //
  // --- PHẦN LOGIC CỦA CLINIC (ĐÃ DUYỆT) ---
  //

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

      // Invalidate cache
      await this.invalidateClinicListCache(); // Xóa cache danh sách và đếm

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
      // Tìm doc trước khi sửa
      const form = await this.clinicFormModel.findOne({ id });

      const result = await this.clinicFormModel.updateOne(
        { id },
        { status: RegisterStatus.PENDING },
      );
      // (Logic kiểm tra lỗi của bạn)
      // ...

      // Invalidate cache
      if (form) {
        await this.invalidateClinicFormCache(form);
      }
      await this.invalidateClinicFormListCache();

      return {
        success: true,
        message: `Đã rollback trạng thái đơn ${id} về PENDING thành công.`,
      };
    } catch (err) {
      // (Logic xử lý lỗi của bạn)
      // ...
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

    // Invalidate cache
    if (updatedClinic) {
      await this.invalidateClinicCache(updatedClinic);
      await this.invalidateClinicListCache();
    }

    return updatedClinic;
  }

  async findAllClinic(skip: number, limit: number): Promise<any> {
    const cacheKey = `clinics:list:${skip}:${limit}`;
    try {
      // 1. Thử lấy từ Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      // 2. Cache Miss
      const clinics = await this.clinicModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(clinics), {
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
      // 1. Thử lấy từ Redis
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);

      // 2. Cache Miss
      const count = await this.clinicModel.countDocuments();

      // 3. Lưu vào Redis
      await this.redis.set(key, JSON.stringify(count), {
        EX: this.listCacheTTL, // Dùng cache ngắn cho số đếm
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
      // 1. Thử lấy từ Redis
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);

      // 2. Cache Miss
      const clinic = await this.clinicModel.findOne({ id: id }).lean().exec();
      if (!clinic) {
        return null;
      }

      // 3. Lưu vào Redis
      await this.redis.set(key, JSON.stringify(clinic), { EX: this.cacheTTL });
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

    // Invalidate cache
    await this.invalidateClinicFormCache(clinic);
    await this.invalidateClinicFormListCache();

    return clinic;
  }

  async clearClinicVerificationToken(id: string) {
    // Tìm doc trước
    const clinic = await this.clinicModel.findById(id);

    const result = await this.clinicModel.updateOne(
      { _id: id },
      { $unset: { verification_token: '', token_expires_at: '' } },
    );

    // Invalidate cache
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

      // Invalidate cache
      await this.invalidateClinicCache(updatedClinic);
      await this.invalidateClinicListCache();

      return updatedClinic;
    } catch (err) {
      // (Logic xử lý lỗi của bạn)
      // ...
      throw err;
    }
  }

  async getClinicByEmail(email: string): Promise<any> {
    const key = this.getClinicKeyByEmail(email);
    try {
      // 1. Thử lấy từ Redis
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);

      // 2. Cache Miss
      const clinic = await this.clinicModel
        .findOne({ 'email.email_address': email })
        .lean()
        .exec();

      if (!clinic) {
        return null;
      }

      // 3. Lưu vào Redis
      await this.redis.set(key, JSON.stringify(clinic), { EX: this.cacheTTL });
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

      // Invalidate cache
      // Xóa cache của clinic này
      await this.invalidateClinicCache(updatedClinic);
      // (Không cần xóa cache list, vì danh sách không hiển thị member_ids)

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