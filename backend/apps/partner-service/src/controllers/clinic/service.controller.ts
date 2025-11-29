import {
  Controller,
  Get,
  UsePipes,
  ValidationPipe,
  HttpStatus,
} from '@nestjs/common';
import { ClinicService } from '../../services/clinic/clinic.service';
import { MessagePattern, Payload, RpcException, EventPattern } from '@nestjs/microservices';
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

  @EventPattern({ cmd: 'createService' })
  async createService(
    @Payload() data: { data: CreateServiceDto; clinic_id: string },
  ) {
    try {
      await this.clinicService.createService(data.data, data.clinic_id);
    } catch (err) {
     throw handleRpcError('PartnerController.createService', err);
    }
  }

  @MessagePattern({ cmd: 'getAllService' })
  async getAllService(
    @Payload() payload: { page?: number; limit?: number },
  ): Promise<any> {
    try {
      const { page = 1, limit = 10 } = payload || {};
      const result = await this.serviceService.getAllService(page, limit);
      return result;
    } catch (err) {
     throw handleRpcError('ServiceController.getAllService', err);
    }
  }

  @EventPattern({ cmd: 'update_service' })
  async updateService(
    @Payload()
    payload: {
      serviceId: string;
      updateServiceDto: any;
      clinic_id: string;
    },
  ) {
    try {
      const { serviceId, updateServiceDto, clinic_id } = payload;
      await this.clinicService.updateService(
        serviceId,
        updateServiceDto,
        clinic_id,
      );
    } catch (err) {
    throw  handleRpcError('PartnerController.updateService', err);
    }
  }

  @EventPattern({ cmd: 'remove_service' })
  async removeService(
    @Payload() payload: { serviceId: string; clinic_id: string },
  ) {
    try {
      const { serviceId, clinic_id } = payload;
      await this.clinicService.removeService(serviceId, clinic_id);
    } catch (err) {
     throw handleRpcError('PartnerController.removeService', err);
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
      throw handleRpcError('ServiceController.getAllServicesFollowClinicId', err);
    }
  }

  @MessagePattern({ cmd: 'getServicesByClinicId' })
  async getServicesByClinicId(
    @Payload() payload: { clinic_id: string; page?: number; limit?: number },
  ) {
    try {
      const { clinic_id, page = 1, limit = 10 } = payload;
      return await this.serviceService.getServicesByClinicId(
        clinic_id,
        page,
        limit,
      );
    } catch (err) {
     throw handleRpcError('ServiceController.getServicesByClinicId', err);
    }
  }

  @MessagePattern({ cmd: 'validateClinicServices' })
  async validateClinicServices(
    @Payload() payload: { clinic_id: string; service_ids: string[] },
  ) {
    try {
      const { clinic_id, service_ids } = payload;
      const result = await this.serviceService.validateClinicServices(
        clinic_id,
        service_ids,
      );
      return result;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      console.error('Error in validateClinicServices:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Đã xảy ra lỗi khi xác thực dịch vụ',
      });
    }
  }

  @MessagePattern({ cmd: 'getAllServicesByClinicId' })
  async getAllServicesByClinicId(
    @Payload() payload: { clinic_id: string; page?: number; limit?: number },
  ) {
    try {
      const { clinic_id, page = 1, limit = 10 } = payload;
      const result = await this.serviceService.getAllServicesByClinicId(
        clinic_id,
        page,
        limit,
      );
      return {
        status: 'success',
        data: result,
      };
    } catch (err) {
     throw handleRpcError('ServiceController.getServicesByClinicId', err);
    }
  }

 @MessagePattern({ cmd: 'updateServiceStatus' })
async updateServiceStatus(
  @Payload() payload: { id: string; is_active: boolean },
) {
  try {
    const { id, is_active } = payload;
    return await this.clinicService.updateServiceStatus(id, is_active); 
  } catch (err) {
    throw handleRpcError('PartnerController.updateServiceStatus', err);
  }
}


  @MessagePattern({ cmd: 'getServiceById' })
  async getServiceById(@Payload() data: { id: string }): Promise<any> {
    try {
      const result = await this.serviceService.getServiceById(data.id);
      return result;
    } catch (err) {
    throw  handleRpcError('PartnerController.getServiceById', err);
    }
  }
}