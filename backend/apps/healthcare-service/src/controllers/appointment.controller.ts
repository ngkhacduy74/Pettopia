import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { AppointmentService } from '../services/appointment.service';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { handleRpcError } from 'src/common/error.detail';
import { CreateAppointmentDto } from 'src/dto/appointment.dto';
import { HttpStatus } from '@nestjs/common/enums';

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller()
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @MessagePattern({ cmd: 'createAppointment' })
  async createAppointment(
    @Payload() payload: { data: CreateAppointmentDto; user_id: string },
  ) {
    try {
      console.log('oqueojakds', payload.data, payload.user_id);

      const result = await this.appointmentService.createAppointment(
        payload.data,
        payload.user_id,
      );

      return {
        status: 'success',
        message: 'Tạo lịch hẹn thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      console.error('Error in createAppointment:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Đã xảy ra lỗi khi tạo lịch hẹn',
      });
    }
  }

  @MessagePattern({ cmd: 'getUserAppointments' })
  async getUserAppointments(
    @Payload() payload: { userId: string; page?: number; limit?: number },
  ) {
    try {
      const { userId, page = 1, limit = 10 } = payload;

      if (!userId) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Thiếu thông tin người dùng',
        });
      }

      const result = await this.appointmentService.getUserAppointments(
        userId,
        page,
        limit,
      );

      return {
        status: 'success',
        message: 'Lấy danh sách lịch hẹn thành công',
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      return handleRpcError('AppointmentController.getUserAppointments', error);
    }
  }

  @MessagePattern({ cmd: 'getAllAppointments' })
  async getAllAppointments(@Payload() payload: { page?: number; limit?: number }) {
    try {
      const { page = 1, limit = 10 } = payload || {};

      const result = await this.appointmentService.getAllAppointments(page, limit);

      return {
        status: 'success',
        message: 'Lấy tất cả lịch hẹn thành công',
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      return handleRpcError('AppointmentController.getAllAppointments', error);
    }
  }
}
