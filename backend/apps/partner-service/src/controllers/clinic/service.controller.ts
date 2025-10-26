import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';

import { ClinicService } from '../../services/clinic/clinic.service';

import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { handleRpcError } from 'src/common/error.detail';
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller()
export class ServiceController {
  constructor(private readonly clinicService: ClinicService) {}

  @MessagePattern({ cmd: 'createService' })
  async createService(@Payload() data: any): Promise<any> {
    try {
      const result = await this.clinicService.createService(data);
      return result;
    } catch (err) {
      handleRpcError('PartnerController.createService', err);
    }
  }

  @MessagePattern({ cmd: 'getAllService' })
  async getAllService(
    @Payload() payload: { page: number; limit: number },
  ): Promise<any> {
    try {
      const { page, limit } = payload;
      const result = await this.clinicService.getAllService(page, limit);
      return result;
    } catch (err) {
      handleRpcError('PartnerController.getAllService', err);
    }
  }

  @MessagePattern({ cmd: 'update_service' })
  async updateService(
    @Payload()
    payload: {
      serviceId: string;
      updateServiceDto: any;
      clinic_id: string;
    },
  ): Promise<any> {
    try {
      const { serviceId, updateServiceDto, clinic_id } = payload;
      const result = await this.clinicService.updateService(
        serviceId,
        updateServiceDto,
        clinic_id,
      );
      return result;
    } catch (err) {
      handleRpcError('PartnerController.updateService', err);
    }
  }

  @MessagePattern({ cmd: 'remove_service' })
  async removeService(
    @Payload() payload: { serviceId: string; clinic_id: string },
  ): Promise<any> {
    try {
      const { serviceId, clinic_id } = payload;
      const result = await this.clinicService.removeService(
        serviceId,
        clinic_id,
      );
      return result;
    } catch (err) {
      handleRpcError('PartnerController.removeService', err);
    }
  }

  @MessagePattern({ cmd: 'updateServiceStatus' })
  async updateServiceStatus(
    @Payload() payload: { id: string; is_active: boolean },
  ): Promise<any> {
    try {
      const { id, is_active } = payload;
      const result = await this.clinicService.updateServiceStatus(
        id,
        is_active,
      );
      return result;
    } catch (err) {
      handleRpcError('PartnerController.updateServiceStatus', err);
    }
  }
}
