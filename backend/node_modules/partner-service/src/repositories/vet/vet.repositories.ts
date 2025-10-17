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
  async updateVetFormStatus(body: any): Promise<any> {
    try {
      const { id, status, note, review_by } = body;
      const vetForm = await this.vetFormModel.findOne({ id: id }).exec();
      if (!vetForm) {
        throw new NotFoundException('Hồ sơ bác sĩ không tồn tại.');
      } else {
        vetForm.status = status;
        vetForm.note = note;
        vetForm.review_by = review_by;
        return await vetForm.save();
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái hồ sơ bác sĩ:', err.message);
      throw new InternalServerErrorException(
        'Không thể cập nhật trạng thái hồ sơ bác sĩ',
      );
    }
  }
}
