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

@Injectable()
export class ClinicsRepository {
  constructor(
    @InjectModel(Clinic_Register.name)
    private clinicFormModel: Model<ClinicRegisterDocument>,
    @InjectModel(Clinic.name)
    private clinicModel: Model<ClinicDocument>,
  ) {}

  async createClinicForm(
    data: CreateClinicFormDto,
  ): Promise<ClinicRegisterDocument> {
    try {
      const clinicDocument = new this.clinicFormModel(data);
      const result = await clinicDocument.save();
      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi tạo form clinic',
      );
    }
  }

  async existsClinicFormByEmail(email_address: string): Promise<boolean> {
    try {
      const doc = await this.clinicFormModel
        .findOne({ 'email.email_address': email_address })
        .lean()
        .exec();
      return !!doc;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi kiểm tra trùng email form clinic',
      );
    }
  }

  async existsClinicFormByPhone(phone_number: string): Promise<boolean> {
    try {
      const doc = await this.clinicFormModel
        .findOne({ 'phone.phone_number': phone_number })
        .lean()
        .exec();
      return !!doc;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi kiểm tra trùng số điện thoại form clinic',
      );
    }
  }

  async existsClinicFormByLicenseNumber(
    license_number: string,
  ): Promise<boolean> {
    try {
      const doc = await this.clinicFormModel
        .findOne({ license_number })
        .lean()
        .exec();
      return !!doc;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi kiểm tra trùng số giấy phép form clinic',
      );
    }
  }

  async existsClinicFormByResponsibleLicense(license: string): Promise<boolean> {
    try {
      const doc = await this.clinicFormModel
        .findOne({ 'representative.responsible_licenses': { $in: [license] } })
        .lean()
        .exec();
      return !!doc;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi kiểm tra trùng giấy phép hành nghề đại diện',
      );
    }
  }
  async findOneClinicForm(id: string): Promise<any> {
    try {
      const findOne = await this.clinicFormModel
        .findOne({ id: id })
        .lean()
        .exec();
      if (!findOne) {
        return null;
      }
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
    return { data, total };
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
      const result = await this.clinicFormModel.updateOne(
        { id },
        { status: RegisterStatus.PENDING },
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException(
          `Không tìm thấy đơn đăng ký với id: ${id} để rollback`,
        );
      }

      if (result.modifiedCount === 0) {
        throw new BadRequestException(
          `Rollback thất bại: trạng thái đơn có thể đã là PENDING hoặc không thể cập nhật`,
        );
      }

      return {
        success: true,
        message: `Đã rollback trạng thái đơn ${id} về PENDING thành công.`,
      };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        err.message || `Lỗi cơ sở dữ liệu khi rollback trạng thái đơn ${id}`,
      );
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
        {
          new: true,
        },
      )
      .exec();

    return updatedClinic;
  }
  async findAllClinic(skip: number, limit: number): Promise<any> {
    try {
      const clinics = await this.clinicModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();
      return clinics;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi truy vấn danh sách phòng khám',
      );
    }
  }

  async countAllClinic(): Promise<number> {
    try {
      return await this.clinicModel.countDocuments();
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi đếm tổng số phòng khám',
      );
    }
  }
  async getClinicById(id: string): Promise<any> {
    try {
      const clinic = await this.clinicModel.findOne({ id: id }).lean().exec();
      if (!clinic) {
        return null;
      }
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

    return clinic;
  }
  async findByVerificationToken(token: string) {
    return this.clinicFormModel.findOne({ verification_token: token });
  }
  async updateClinicForm(id: string, dto: UpdateClinicFormDto): Promise<any> {
    return this.clinicFormModel.findOneAndUpdate({ id: id }, dto, {
      new: true,
      runValidators: true,
    });
  }
  async findClinicByVerificationToken(token: string): Promise<any> {
    return this.clinicFormModel.findOne({ verification_token: token });
  }

  async clearClinicVerificationToken(id: string) {
    return this.clinicModel.updateOne(
      { _id: id },
      { $unset: { verification_token: '', token_expires_at: '' } },
    );
  }
  async updateClinic(id: string, dto: any): Promise<ClinicDocument> {
    try {
      const updatedClinic = await this.clinicModel
        .findOneAndUpdate(
          { id: id },
          { $set: dto },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      if (!updatedClinic) {
        throw new NotFoundException(
          `Không tìm thấy phòng khám với id: ${id} để cập nhật`,
        );
      }

      return updatedClinic;
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }

      if (err.code === 11000) {
        throw new BadRequestException(
          'Cập nhật thất bại: Dữ liệu bị trùng lặp (ví dụ: số giấy phép).',
        );
      }
      throw new InternalServerErrorException(
        err.message || `Lỗi cơ sở dữ liệu khi cập nhật phòng khám ${id}`,
      );
    }
  }
  async getClinicByEmail(email: string): Promise<any> {
    try {
      const clinic = await this.clinicModel
        .findOne({ 'email.email_address': email })
        .lean()
        .exec();

      if (!clinic) {
        return null;
      }
      return clinic;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message ||
          `Lỗi cơ sở dữ liệu khi tìm phòng khám với email: ${email}`,
      );
    }
  }
}
