// src/users/users.repository.ts
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createRpcError } from 'src/common/error.detail';
import { CreateClinicFormDto } from 'src/dto/clinic/clinic/create-clinic-form.dto';
import { CreateClinicDto } from 'src/dto/clinic/clinic/create-clinic.dto';
import { UpdateStatusClinicDto } from 'src/dto/clinic/clinic/update-status.dto';
import { CreateVetDto } from 'src/dto/vet/create-vet.dto';
import { UpdateStatusVetDto } from 'src/dto/vet/update-vet-form';
import { VetRegisterDto } from 'src/dto/vet/vet-register-form';
import {
  Clinic_Register,
  ClinicRegisterDocument,
  RegisterStatus,
} from 'src/schemas/clinic/clinic-register.schema';
import { Clinic, ClinicDocument } from 'src/schemas/clinic/clinic.schema';
import {
  Vet_Register,
  VetRegisterDocument,
} from 'src/schemas/vet/vet-register.schema';
import { Vet, VetDocument } from 'src/schemas/vet/vet.schema';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VetRepository {
  constructor(
    @InjectModel(Vet_Register.name)
    private vetFormModel: Model<VetRegisterDocument>,
    @InjectModel(Vet.name)
    private vetModel: Model<VetDocument>,
    @InjectModel(Clinic.name)
    private clinicModel: Model<ClinicDocument>
  ) { }
  async findVetById(user_id: string): Promise<any | null> {
    try {
      const vet = await this.vetModel.findOne({ id: user_id }).exec();

      if (!vet) {
        return null;
      }

      return vet;
    } catch (err) {
      console.error(' Lỗi khi tìm bác sĩ theo user_id:', err.message);
      throw new InternalServerErrorException(
        'Không thể truy vấn thông tin bác sĩ',
      );
    }
  }

  async findPendingVetFormByUserId(user_id: string): Promise<any | null> {
    try {
      return await this.vetFormModel
        .findOne({
          user_id,
          status: RegisterStatus.PENDING,
        })
        .exec();
    } catch (err) {
      console.error(
        'Lỗi khi tìm form pending theo user_id:',
        err.message,
      );
      throw new InternalServerErrorException('Không thể kiểm tra trạng thái đăng ký.');
    }
  }

  async findOneVetByFormId(formId: string): Promise<VetDocument | null> {
    try {
      const vet = await this.vetModel.findOne({ vet_form_id: formId }).exec();
      return vet;
    } catch (err) {
      console.error('Lỗi khi tìm bác sĩ theo vet_form_id:', err.message);
      throw new InternalServerErrorException('Không thể truy vấn bác sĩ.');
    }
  }

  async findOneVetByClinic(clinic_id: string, vet_id: string): Promise<any> {
    try {
      return await this.clinicModel.findOne({
        id: clinic_id,
        member_ids: vet_id,
      });
    } catch (err) {
      console.error('Error findOneVetByClinic:', err.message);
      throw err;
    }
  }


  async create(vetRegisterData: VetRegisterDto, user_id: string): Promise<any> {
    try {
      const newVet = new this.vetFormModel({
        id: uuidv4(),
        ...vetRegisterData,
        user_id: user_id,
      });
      return await newVet.save();
    } catch (err) {
      console.error('Lỗi khi tạo Vet:', err.message);
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
      console.error('Lỗi khi tạo bác sĩ:', err.message);
      throw new InternalServerErrorException('Không thể tạo bác sĩ mới');
    }
  }

  async updateVetFormStatus(body: UpdateStatusVetDto): Promise<any> {
    try {
      const { id, status, note, review_by } = body;
      console.log('[updateVetFormStatus] Payload nhận được:', body);
      const vetForm = await this.vetFormModel.findOne({ id: id }).exec();
      console.log('Tìm thấy hồ sơ bác sĩ để cập nhật:', id, vetForm);
      if (!vetForm) {
        console.warn(' Không tìm thấy hồ sơ bác sĩ.');
        return null;
      }

      vetForm.status = status;
      vetForm.note = note ?? '';
      vetForm.review_by = review_by;

      const updatedVetForm = await vetForm.save();
      console.log('Đã cập nhật trạng thái hồ sơ bác sĩ:', updatedVetForm.id);

      return updatedVetForm;
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái hồ sơ bác sĩ:', err.message);
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
    return this.vetFormModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async countVetForms(filter: any = {}): Promise<number> {
    return this.vetFormModel.countDocuments(filter).exec();
  }

  async rollBackStatusVetForm(
    id: string,
    previousStatus: RegisterStatus,
  ): Promise<any> {
    try {
      const vetForm = await this.vetFormModel.findOne({ id }).exec();

      if (!vetForm) {
        console.warn(
          `[partner] Không tìm thấy hồ sơ bác sĩ để rollback (id: ${id}).`,
        );
        return null;
      }
      vetForm.status = previousStatus;
      vetForm.note = `[ROLLBACK] Trạng thái đã được hoàn tác về ${previousStatus} vào ${new Date().toLocaleString()}`;

      const savedForm = await vetForm.save();

      console.log(
        `[partner] Đã rollback trạng thái hồ sơ bác sĩ ${id} về ${previousStatus}`,
      );
      return savedForm;
    } catch (err) {
      console.error(
        '[partner] Lỗi khi rollback trạng thái hồ sơ bác sĩ:',
        err.message,
      );
      throw new InternalServerErrorException(
        'Không thể rollback trạng thái hồ sơ bác sĩ.',
      );
    }
  }
  async findVetFormByLicenseNumber(license_number: string): Promise<any> {
    if (!license_number || typeof license_number !== 'string') {
      throw new BadRequestException('Số giấy phép hành nghề không hợp lệ.');
    }

    try {
      const existingForm = await this.vetFormModel
        .findOne({ license_number })
        .lean()
        .exec();

      return existingForm || null;
    } catch {
      throw new InternalServerErrorException(
        'Không thể kiểm tra số giấy phép hành nghề.',
      );
    }
  }

  async addClinicToVet(
    vetId: string,
    clinicId: string,
    role?: 'vet' | 'staff' | 'receptionist' | 'manager',
  ): Promise<VetDocument> {
    try {
      // Lấy thông tin vet hiện tại
      const vet = await this.vetModel.findOne({ id: vetId }).exec();

      if (!vet) {
        throw new NotFoundException(
          `Không tìm thấy hồ sơ bác sĩ với id: ${vetId}`,
        );
      }

      // Thêm clinic_id vào mảng clinic_id (nếu chưa có)
      const updateData: any = {
        $addToSet: { clinic_id: clinicId },
        $set: { updatedAt: new Date() },
      };

      // Nếu có role, thêm hoặc cập nhật vào clinic_roles
      if (role) {
        const existingRoleIndex = vet.clinic_roles?.findIndex(
          (cr) => cr.clinic_id === clinicId,
        );

        if (existingRoleIndex !== undefined && existingRoleIndex >= 0) {
          // Đã có role cho clinic này, cập nhật role và joined_at
          const clinicRoles = [...(vet.clinic_roles || [])];
          clinicRoles[existingRoleIndex] = {
            clinic_id: clinicId,
            role: role,
            joined_at: new Date(),
          };
          updateData.$set.clinic_roles = clinicRoles;
        } else {
          // Chưa có role cho clinic này, thêm mới
          const newClinicRole = {
            clinic_id: clinicId,
            role: role,
            joined_at: new Date(),
          };
          updateData.$push = {
            clinic_roles: newClinicRole,
          };
        }
      }

      const updatedVet = await this.vetModel
        .findOneAndUpdate({ id: vetId }, updateData, { new: true })
        .exec();

      if (!updatedVet) {
        throw new NotFoundException(
          `Không tìm thấy hồ sơ bác sĩ với id: ${vetId}`,
        );
      }

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

  async removeClinicFromVet(vetId: string, clinicId: string): Promise<VetDocument> {
    try {
      // Lấy thông tin vet hiện tại để xử lý clinic_roles
      const vet = await this.vetModel.findOne({ id: vetId }).exec();

      if (!vet) {
        throw new NotFoundException(
          `Không tìm thấy hồ sơ bác sĩ với id: ${vetId}`,
        );
      }

      // Xóa clinic_id và clinic_roles tương ứng
      const updateData: any = {
        $pull: { clinic_id: clinicId },
        $set: { updatedAt: new Date() },
      };

      // Xóa clinic_role tương ứng với clinic này
      if (vet.clinic_roles && vet.clinic_roles.length > 0) {
        const updatedClinicRoles = vet.clinic_roles.filter(
          (cr) => cr.clinic_id !== clinicId,
        );
        updateData.$set.clinic_roles = updatedClinicRoles;
      }

      const updatedVet = await this.vetModel
        .findOneAndUpdate({ id: vetId }, updateData, { new: true })
        .exec();

      if (!updatedVet) {
        throw new NotFoundException(
          `Không tìm thấy hồ sơ bác sĩ với id: ${vetId}`,
        );
      }

      return updatedVet;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        error.message || 'Không thể xóa phòng khám khỏi hồ sơ bác sĩ.',
      );
    }
  }
}
