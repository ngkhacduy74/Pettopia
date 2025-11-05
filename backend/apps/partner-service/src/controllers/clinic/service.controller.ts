import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';

import { ClinicService } from '../../services/clinic/clinic.service';

import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { handleRpcError } from 'src/common/error.detail';
import { ServiceService } from 'src/services/clinic/service.service';
import { CreateServiceDto } from 'src/dto/clinic/services/create-service.dto';
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller()
export class ServiceController {
  constructor(
    private readonly clinicService: ClinicService,
    private readonly serviceService: ServiceService,
  ) {}

  @MessagePattern({ cmd: 'createService' })
  async createService(
    @Payload() data: { data: CreateServiceDto; clinic_id: string },
  ): Promise<any> {
    try {
      const result = await this.clinicService.createService(
        data.data,
        data.clinic_id,
      );
      return result;
    } catch (err) {
      handleRpcError('PartnerController.createService', err);
    }
  }

  // @MessagePattern({ cmd: 'getAllService' })
  // async getAllService(
  //   @Payload() payload: { page: number; limit: number },
  // ): Promise<any> {
  //   try {
  //     const { page, limit } = payload;
  //     const result = await this.clinicService.getAllService(page, limit);
  //     return result;
  //   } catch (err) {
  //     handleRpcError('PartnerController.getAllService', err);
  //   }
  // }

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

  @MessagePattern({ cmd: 'getAllServicesFollowClinicId' })
  async getAllServicesFollowClinicId(
    @Payload() payload: { clinic_id: string; page: number; limit: number },
  ) {
    try {
      const { clinic_id, page, limit } = payload;
      return await this.serviceService.getAllServicesByClinicId(
        clinic_id,
        page,
        limit,
      );
    } catch (err) {
      handleRpcError('ServiceController.getAllServicesFollowClinicId', err);
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
  // @MessagePattern({ cmd: 'getServicesByClinicId' })
  // async getServicesByClinicId(
  //   @Payload() data: { clinic_id: string },
  // ): Promise<any> {
  //   try {
  //     const result = await this.serviceService.getServicesByClinicId(
  //       data.clinic_id,
  //     );
  //     return result;
  //   } catch (err) {
  //     handleRpcError('PartnerController.getServicesByClinicId', err);
  //   }
  // }
  @MessagePattern({ cmd: 'getServiceById' })
  async getServiceById(@Payload() data: { id: string }): Promise<any> {
    try {
      const result = await this.serviceService.getServiceById(data.id);
      return result;
    } catch (err) {
      handleRpcError('PartnerController.getServiceById', err);
    }
  }
}
