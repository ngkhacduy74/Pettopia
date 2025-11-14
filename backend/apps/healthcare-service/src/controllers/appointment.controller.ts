import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { AppointmentService } from '../services/appointment.service';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { handleRpcError } from 'src/common/error.detail';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
  CancelAppointmentDto,
} from 'src/dto/appointment.dto';
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

  @MessagePattern({ cmd: 'getAppointments' })
  async getAppointments(
    @Payload()
    payload: {
      role: string | string[];
      userId?: string;
      clinicId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    try {
      const { role, userId, clinicId, page = 1, limit = 10 } = payload;

      const result = await this.appointmentService.getAppointments(
        role,
        userId,
        clinicId,
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
      return handleRpcError('AppointmentController.getAppointments', error);
    }
  }

  @MessagePattern({ cmd: 'updateAppointmentStatus' })
  async updateAppointmentStatus(
    @Payload()
    payload: {
      appointmentId: string;
      updateData: UpdateAppointmentStatusDto;
      updatedByUserId?: string;
    },
  ) {
    try {
      const { appointmentId, updateData, updatedByUserId } = payload;

      if (!appointmentId) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Thiếu thông tin ID lịch hẹn',
        });
      }

      const result = await this.appointmentService.updateAppointmentStatus(
        appointmentId,
        updateData,
        updatedByUserId,
      );

      return {
        status: 'success',
        message: 'Cập nhật trạng thái lịch hẹn thành công',
        data: result,
      };
    } catch (error) {
      return handleRpcError(
        'AppointmentController.updateAppointmentStatus',
        error,
      );
    }
  }

  @MessagePattern({ cmd: 'cancelAppointment' })
  async cancelAppointment(
    @Payload()
    payload: {
      appointmentId: string;
      cancelledByUserId: string;
      role: string | string[];
      cancelData: CancelAppointmentDto;
      clinicId?: string;
    },
  ) {
    try {
      const {
        appointmentId,
        cancelledByUserId,
        role,
        cancelData,
        clinicId,
      } = payload;

      if (!appointmentId) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Thiếu thông tin ID lịch hẹn',
        });
      }

      if (!cancelledByUserId) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Thiếu thông tin người hủy',
        });
      }

      // Đảm bảo cancelData luôn là object, ngay cả khi undefined
      const safeCancelData = cancelData || {};
      
      // Log để debug
      console.log('Cancel appointment payload:', {
        appointmentId,
        cancelledByUserId,
        role,
        cancelData: safeCancelData,
        clinicId,
      });

      const result = await this.appointmentService.cancelAppointment(
        appointmentId,
        cancelledByUserId,
        role,
        safeCancelData,
        clinicId,
      );

      return {
        status: 'success',
        message: 'Hủy lịch hẹn thành công',
        data: result,
      };
    } catch (error) {
      return handleRpcError('AppointmentController.cancelAppointment', error);
    }
  }

  @MessagePattern({ cmd: 'getAppointmentById' })
  async getAppointmentById(
    @Payload()
    payload: {
      appointmentId: string;
      role: string | string[];
      userId?: string;
      clinicId?: string;
    },
  ) {
    try {
      const { appointmentId, role, userId, clinicId } = payload;

      if (!appointmentId) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Thiếu thông tin ID lịch hẹn',
        });
      }

      const result = await this.appointmentService.getAppointmentById(
        appointmentId,
        role,
        userId,
        clinicId,
      );

      return {
        status: 'success',
        message: 'Lấy thông tin lịch hẹn thành công',
        data: result,
      };
    } catch (error) {
      return handleRpcError('AppointmentController.getAppointmentById', error);
    }
  }
}
