import {
  Controller,
  Get,
  UsePipes,
  ValidationPipe,
  HttpStatus,
} from '@nestjs/common';
import { MessagePattern, Payload, RpcException, EventPattern } from '@nestjs/microservices';
import { handleRpcError } from 'src/common/error.detail';
import { CreateClinicShiftDto } from 'src/dto/clinic/shift/create-shift.dto';
import { UpdateClinicShiftDto } from 'src/dto/clinic/shift/update-shift.dto';
import { ShiftService } from 'src/services/clinic/shift.service';

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller()
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @MessagePattern({ cmd: 'getClinicShiftById' })
  async getClinicShiftById(
    @Payload() payload: { clinic_id: string; shift_id: string },
  ) {
    try {
      const { clinic_id, shift_id } = payload;
      const shift = await this.shiftService.getClinicShiftById(
        clinic_id,
        shift_id,
      );
      return {
        status: 'success',
        data: shift,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      console.error('Error in getClinicShiftById:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Đã xảy ra lỗi khi lấy thông tin ca làm việc',
      });
    }
  }

  @MessagePattern({ cmd: 'createClinicShift' })
  async createClinicShift(@Payload() data: CreateClinicShiftDto) {
    try {
      return await this.shiftService.createClinicShift(data);
    } catch (err) {
      throw handleRpcError('ShiftController.createClinicShift', err);
    }
  }

  @MessagePattern({ cmd: 'getClinicShifts' })
  async getClinicShifts(
    @Payload() payload: { page: number; limit: number; clinic_id: string },
  ) {
    try {
      const { page, limit, clinic_id } = payload;
      return await this.shiftService.getClinicShifts(page, limit, clinic_id);
    } catch (err) {
      throw handleRpcError('ShiftController.getClinicShifts', err);
    }
  }

  @MessagePattern({ cmd: 'updateClinicShift' })
  async updateClinicShift(@Payload() payload: any) {
    try {
      const { id, ...updateData } = payload;
      const dto: UpdateClinicShiftDto = updateData;

      return await this.shiftService.updateClinicShift(id, dto);
    } catch (err) {
      throw handleRpcError('ShiftController.updateClinicShift', err);
    }
  }
  
  @MessagePattern({ cmd: 'getShiftsByClinicId' })
  async getShiftsByClinicId(@Payload() data: { clinic_id: string }) {
    try {
      return await this.shiftService.getShiftsByClinicId(data.clinic_id);
    } catch (err) {
      throw handleRpcError('ShiftController.getShiftsByClinicId', err);
    }
  }
  
  @MessagePattern({ cmd: 'deleteClinicShift' })
  async deleteClinicShift(
    @Payload() payload: { id: string; clinic_id: string },
  ) {
    try {
      if (!payload.id || !payload.clinic_id) {
        throw new RpcException('Thiếu thông tin bắt buộc');
      }
      return await this.shiftService.deleteShift(payload.id, payload.clinic_id);
    } catch (err) {
      throw handleRpcError('ShiftController.deleteClinicShift', err);
    }
  }
  
  // @EventPattern({ cmd: 'updateClinicShiftStatus' })
  // async updateClinicShiftStatus(
  //   @Payload() payload: { id: string; is_active: boolean },
  // ) {
  //   try {
  //     const { id, is_active } = payload;
  //     await this.shiftService.updateClinicShiftStatus(id, is_active);
  //   } catch (err) {
  //     handleRpcError('ShiftController.updateClinicShiftStatus', err);
  //   }
  // }
}