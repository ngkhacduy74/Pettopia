import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';

import { ClinicService } from '../../services/clinic/clinic.service';

import { MessagePattern, Payload, RpcException, EventPattern } from '@nestjs/microservices';
import { handleRpcError } from 'src/common/error.detail';
import { CreateClinicFormDto } from 'src/dto/clinic/clinic/create-clinic-form.dto';
import { UpdateStatusClinicDto } from 'src/dto/clinic/clinic/update-status.dto';
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller()
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @MessagePattern({ cmd: 'getAllClinicForm' })
  async getAllClinicForm(): Promise<any> {
    try {
      const result = await this.clinicService.findAllClinicForm();
      return result;
    } catch (err) {
      handleRpcError('ClinicController.getAllClinicForm', err);
    }
  }
  
  @EventPattern({ cmd: 'registerClinic' })
  async createClinicForm(CreateClinicFormData: any) {
    try {
      console.log('registerClinic123', CreateClinicFormData);
      await this.clinicService.createClinicForm(CreateClinicFormData);
    } catch (err) {
      handleRpcError('ClinicController.createClinicForm', err);
    }
  }

  @MessagePattern({ cmd: 'getClinicFormById' })
  async findClinicFormById(@Payload() data: { id: string }): Promise<any> {
    try {
      const result = await this.clinicService.findClinicFormById(data.id);
      return result;
    } catch (err) {
      handleRpcError('ClinicController.findClinicFormById', err);
    }
  }

  @EventPattern({ cmd: 'updateStatusClinicForm' })
  async updateStatusClinicForm(
    @Payload() updateStatus: UpdateStatusClinicDto,
  ) {
    try {
      await this.clinicService.updateStatusClincForm(updateStatus);
    } catch (err) {
      handleRpcError('ClinicController.updateStatusClinicForm', err);
    }
  }
  
  @EventPattern({ cmd: 'updateClinicActiveStatus' })
  async updateClinicActiveStatus(
    @Payload() data: { id: string; is_active: boolean },
  ) {
    try {
      await this.clinicService.updateClinicActiveStatus(
        data.id,
        data.is_active,
      );
    } catch (err) {
      handleRpcError('ClinicController.updateClinicActiveStatus', err);
    }
  }
  
  @MessagePattern({ cmd: 'findAllClinic' })
  async findAllClinic(
    @Payload() data: { page?: number; limit?: number },
  ): Promise<any> {
    try {
      const result = await this.clinicService.findAllClinic(
        data.page,
        data.limit,
      );
      return result;
    } catch (err) {
      handleRpcError('ClinicController.findAllClinic', err);
    }
  }
  
  @MessagePattern({ cmd: 'getClinicById' })
  async getClinicById(@Payload() data: { id: string }): Promise<any> {
    try {
      const result = await this.clinicService.getClinicById(data.id);
      return result;
    } catch (err) {
      handleRpcError('ClinicController.getClinicById', err);
    }
  }
  
  @EventPattern({ cmd: 'updateClinicFormByMail' })
  async updateClinicFormByMail(@Payload() data: any) {
    try {
      await this.clinicService.updateClinicFormByMail(data);
    } catch (err) {
      handleRpcError('ClinicController.updateClinicFormByMail', err);
    }
  }
  
  @MessagePattern({ cmd: 'getClinicByVerificationToken' })
  async getClinicByVerificationToken(@Payload() data: any): Promise<any> {
    try {
      const { token } = data;
      const clinic =
        await this.clinicService.getClinicByVerificationToken(token);

      return {
        status: 'success',
        message: 'Lấy thông tin phòng khám theo token thành công.',
        data: clinic,
      };
    } catch (error) {
      handleRpcError('PartnerController.getClinicByVerificationToken', error);
    }
  }
  
  @EventPattern({ cmd: 'updateClinicForm' })
  async updateClinicForm(@Payload() data: any) {
    try {
      const { id, dto } = data;
      console.log('updateClinicForm data:', data);
      await this.clinicService.updateClinicForm(id, dto);
    } catch (err) {
      handleRpcError('ClinicController.updateClinicForm', err);
    }
  }
}