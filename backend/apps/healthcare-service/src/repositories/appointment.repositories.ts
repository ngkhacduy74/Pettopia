import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Appointment, AppointmentDocument } from '../schemas/appoinment.schema';

@Injectable()
export class AppointmentRepository {
  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
  ) { }

  async create(appointmentData: any): Promise<Appointment> {
    try {
      return await this.appointmentModel.create(appointmentData);
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi cơ sở dữ liệu khi tạo lịch hẹn',
      );
    }
  }

  async insertMany(appointments: any[]): Promise<Appointment[]> {
    try {
      return (await this.appointmentModel.insertMany(appointments)) as any;
    } catch (error) {
      console.error('❌ Error in insertMany:', JSON.stringify(error, null, 2));
      if (error.errors) {
        console.error('Validation Errors:', JSON.stringify(error.errors, null, 2));
      }
      throw new InternalServerErrorException(
        error.message || 'Lỗi cơ sở dữ liệu khi tạo nhiều lịch hẹn',
      );
    }
  }

  async existsActiveForClinicAndPet(
    clinicId: string,
    petId: string,
    statuses: string[],
  ): Promise<boolean> {
    try {
      const query: any = {
        clinic_id: clinicId,
        pet_ids: petId,
      };

      if (statuses.length) query.status = { $in: statuses };

      return !!(await this.appointmentModel.exists(query));
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi kiểm tra lịch hẹn phòng khám + pet',
      );
    }
  }

  async findByUserId(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: Appointment[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.appointmentModel
          .find({ user_id: userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.appointmentModel.countDocuments({ user_id: userId }),
      ]);

      return { data, total };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi lấy lịch hẹn theo user',
      );
    }
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ data: Appointment[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.appointmentModel
          .find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.appointmentModel.countDocuments(),
      ]);

      return { data, total };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi lấy tất cả lịch hẹn',
      );
    }
  }

  async findByClinicId(
    clinicId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: Appointment[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.appointmentModel
          .find({ clinic_id: clinicId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.appointmentModel.countDocuments({ clinic_id: clinicId }),
      ]);

      return { data, total };
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi lấy lịch hẹn theo phòng khám',
      );
    }
  }

  async findByClinicAndDateAndStatuses(
    clinicId: string,
    date: Date,
    statuses: string[],
  ): Promise<Appointment[]> {
    try {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const query: any = {
        clinic_id: clinicId,
        date: { $gte: start, $lt: end },
      };

      if (statuses.length) query.status = { $in: statuses };

      return this.appointmentModel.find(query).sort({ createdAt: 1 }).lean();
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi lấy lịch hẹn theo ngày + phòng khám',
      );
    }
  }

  async findByVetAndStatuses(
    vetId: string,
    statuses: string[],
  ): Promise<Appointment[]> {
    try {
      const query: any = { vet_id: vetId };
      if (statuses.length) query.status = { $in: statuses };

      return this.appointmentModel
        .find(query)
        .sort({ date: 1, createdAt: 1 })
        .lean();
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi lấy lịch hẹn theo bác sĩ',
      );
    }
  }

  async existsActiveForClinicPetVet(
    clinicId: string,
    petId: string,
    vetId: string,
    statuses: string[],
  ): Promise<boolean> {
    try {
      const query: any = {
        clinic_id: clinicId,
        pet_ids: petId,
        vet_id: vetId,
      };

      if (statuses.length) query.status = { $in: statuses };

      return !!(await this.appointmentModel.exists(query));
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi kiểm tra lịch hẹn (clinic + pet + vet)',
      );
    }
  }

  async findById(id: string): Promise<Appointment | null> {
    try {
      return this.appointmentModel.findOne({ id }).lean();
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi tìm lịch hẹn theo ID',
      );
    }
  }

  async updateStatus(
    id: string,
    status: string,
    cancelReason?: string,
    cancelledBy?: string,
  ): Promise<Appointment | null> {
    try {
      const updateData: any = { status };

      if (cancelReason !== undefined) updateData.cancel_reason = cancelReason;
      if (cancelledBy !== undefined) updateData.cancelled_by = cancelledBy;

      return this.appointmentModel
        .findOneAndUpdate({ id }, updateData, { new: true })
        .lean();
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi cập nhật trạng thái lịch hẹn',
      );
    }
  }

  async update(
    id: string,
    updateData: Partial<Appointment>,
  ): Promise<Appointment | null> {
    try {
      return this.appointmentModel
        .findOneAndUpdate({ id }, updateData, { new: true })
        .lean();
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi cập nhật lịch hẹn',
      );
    }
  }

  async remove(id: string): Promise<Appointment | null> {
    try {
      return this.appointmentModel.findOneAndDelete({ id }).lean();
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi xóa lịch hẹn',
      );
    }
  }
}
