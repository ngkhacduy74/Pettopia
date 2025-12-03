import { Controller, Get, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';

import { ClinicService } from '../../services/clinic/clinic.service';

import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { createRpcError, handleRpcError } from 'src/common/error.detail';
import { CreateClinicFormDto } from 'src/dto/clinic/clinic/create-clinic-form.dto';
import { UpdateStatusClinicDto } from 'src/dto/clinic/clinic/update-status.dto';
import { VetService } from 'src/services/vet/vet.service';
import { VetRegisterDto } from 'src/dto/vet/vet-register-form';
import { UpdateStatusVetDto } from 'src/dto/vet/update-vet-form';
import { UserRole } from 'src/schemas/vet/vet.schema';

@Controller()
export class VetController {
  constructor(private readonly vetService: VetService) {}

  @MessagePattern({ cmd: 'registerVet' })
  async vetRegister(@Payload() payload: any): Promise<any> {
    try {
      const { user_id, ...vetData } = payload;
      console.log('Received vet registration data:', vetData, user_id);
      const result = await this.vetService.vetRegister(user_id, vetData);
      return result;
    } catch (err) {
      handleRpcError('VetController.vetRegister', err);
    }
  }
  @MessagePattern({ cmd: 'updateVetFormStatus' })
  async updateVetFormStatus(@Payload() payload: any): Promise<any> {
    try {
      const result = await this.vetService.updateVetFormStatus(payload);
      return {
        message: 'Cập nhật trạng thái form thú y thành công',
        data: result,
      };
    } catch (err) {
      handleRpcError('VetController.updateVetFormStatus', err);
    }
  }
  @MessagePattern({ cmd: 'getAllVetForm' })
  async getAllVetForm(@Payload() payload: any): Promise<any> {
    try {
      const { page = 1, limit = 10, status } = payload;
      const result = await this.vetService.getAllVetForm(page, limit, status);

      return {
        message: 'Lấy danh sách hồ sơ bác sĩ thành công',
        data: result,
      };
    } catch (err) {
      handleRpcError('VetController.getAllVetForm', err);
    }
  }
@MessagePattern({ cmd: 'getVetById' })
async getVetById(@Payload() payload: any): Promise<any> {
  try {
    const { roles, clinic_id, vet_id } = payload;

    const userRoles = Array.isArray(roles) ? roles : [roles];

    if (userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.STAFF)) {
      return this.vetService.getVetById(vet_id);
    }

    if (userRoles.includes(UserRole.Clinic)) {
      return this.vetService.getVetByClinic(clinic_id, vet_id);
    }
    throw createRpcError(
      HttpStatus.FORBIDDEN,
      'Bạn không có quyền xem thông tin bác sĩ này',
      'Forbidden'
    );

  } catch (err) {
    throw handleRpcError('VetController.getVetById', err);
  }
}


}
