// src/users/users.repository.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateClinicFormDto } from 'src/dto/clinic/create-clinic-form.dto';
import { CreateClinicDto } from 'src/dto/clinic/create-clinic.dto';
import { UpdateStatusClinicDto } from 'src/dto/clinic/update-status.dto';
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
  ) {}
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

  async findOneVetByFormId(formId: string): Promise<VetDocument | null> {
    try {
      const vet = await this.vetModel.findOne({ vet_form_id: formId }).exec();
      return vet;
    } catch (err) {
      console.error('Lỗi khi tìm bác sĩ theo vet_form_id:', err.message);
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
}
