import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { CreateAppointmentDto } from 'src/dto/appointment.dto';
import { AppointmentRepository } from '../repositories/appointment.repositories';
import { AppointmentStatus } from 'src/schemas/appoinment.schema';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly appointmentRepositories: AppointmentRepository,
  ) {}
  async createAppointment(
    data: CreateAppointmentDto,
    user_id: string,
  ): Promise<any> {
    console.log('data service12312323', data, user_id);
    const newAppointmentData = {
      ...data,
      user_id: user_id,
      status: AppointmentStatus.Pending_Confirmation,
    };

    try {
      const result =
        await this.appointmentRepositories.create(newAppointmentData);

      return result;
    } catch (err) {
      if (err.code === 11000) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: 'Lịch hẹn của bạn bị trùng lặp.',
        });
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi không xác định khi tạo lịch hẹn',
      });
    }
  }
}
