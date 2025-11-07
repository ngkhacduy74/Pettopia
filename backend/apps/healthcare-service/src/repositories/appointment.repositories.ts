// src/users/users.repository.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Appointment,
  AppointmentDocument,
  AppointmentSchema,
} from '../schemas/appoinment.schema';
import { CreateAppointmentDto } from 'src/dto/appointment.dto';

@Injectable()
export class AppointmentRepository {
  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
  ) {}
  async create(appointmentData: any): Promise<Appointment> {
    try {
      console.log('appointmentData repository1231231', appointmentData);
      return await this.appointmentModel.create(appointmentData);
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi cơ sở dữ liệu khi tạo lịch hẹn',
      );
    }
  }

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
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
        error.message || 'Lỗi khi lấy danh sách lịch hẹn',
      );
    }
  }
}
