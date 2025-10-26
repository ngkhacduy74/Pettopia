import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { handleRpcError } from 'src/common/error.detail';
import { CreateClinicShiftDto } from 'src/dto/clinic/create-shift.dto';
import { UpdateClinicShiftDto } from 'src/dto/clinic/update-shift.dto';
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

  @MessagePattern({ cmd: 'createClinicShift' })
  async createClinicShift(@Payload() data: CreateClinicShiftDto) {
    try {
      return await this.shiftService.createClinicShift(data);
    } catch (err) {
      handleRpcError('ShiftController.createClinicShift', err);
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
      handleRpcError('ShiftController.getClinicShifts', err);
    }
  }

  @MessagePattern({ cmd: 'updateClinicShift' })
  async updateClinicShift(@Payload() payload: any) {
    try {
      const { id, ...updateData } = payload;
      const dto: UpdateClinicShiftDto = updateData;

      return await this.shiftService.updateClinicShift(id, dto);
    } catch (err) {
      handleRpcError('ShiftController.updateClinicShift', err);
    }
  }

  //   @MessagePattern({ cmd: 'deleteClinicShift' })
  //   async deleteClinicShift(@Payload() payload: { id: string }) {
  //     try {
  //       return await this.shiftService.deleteClinicShift(payload.id);
  //     } catch (err) {
  //       handleRpcError('ShiftController.deleteClinicShift', err);
  //     }
  //   }

  //   @MessagePattern({ cmd: 'updateClinicShiftStatus' })
  //   async updateClinicShiftStatus(
  //     @Payload() payload: { id: string; is_active: boolean },
  //   ) {
  //     try {
  //       const { id, is_active } = payload;
  //       return await this.shiftService.updateClinicShiftStatus(id, is_active);
  //     } catch (err) {
  //       handleRpcError('ShiftController.updateClinicShiftStatus', err);
  //     }
  //   }
}
