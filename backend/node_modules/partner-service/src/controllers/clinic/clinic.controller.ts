import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';

import { ClinicService } from '../../services/clinic/clinic.service';

import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
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

  @MessagePattern({ cmd: 'getAllClinic' })
  async getAllClinicForm(): Promise<any> {
    try {
      const result = await this.clinicService.findAllClinicForm();
      return result;
    } catch (err) {
      handleRpcError('ClinicController.getAllClinicForm', err);
    }
  }
  @MessagePattern({ cmd: 'registerClinic' })
  async createClinicForm(CreateClinicFormData: any): Promise<any> {
    try {
      console.log('registerClinic123', CreateClinicFormData);
      const result =
        await this.clinicService.createClinicForm(CreateClinicFormData);
      return result;
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

  @MessagePattern({ cmd: 'updateStatusClinicForm' })
  async updateStatusClinicForm(
    @Payload() updateStatus: UpdateStatusClinicDto,
  ): Promise<any> {
    try {
      const result =
        await this.clinicService.updateStatusClincForm(updateStatus);
      return {
        message: 'Cập nhật trạng thái form đăng ký thành công',
        data: result,
      };
    } catch (err) {
      handleRpcError('ClinicController.updateStatusClinicForm', err);
    }
  }
  @MessagePattern({ cmd: 'updateClinicActiveStatus' })
  async updateClinicActiveStatus(
    @Payload() data: { id: string; is_active: boolean },
  ): Promise<any> {
    try {
      const result = await this.clinicService.updateClinicActiveStatus(
        data.id,
        data.is_active,
      );
      return result;
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
  @MessagePattern({ cmd: 'updateClinicFormByMail' })
  async updateClinicFormByMail(@Payload() data: any): Promise<any> {
    try {
      return await this.clinicService.updateClinicFormByMail(data);
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
  @MessagePattern({ cmd: 'updateClinicForm' })
  async updateClinicForm(@Payload() data: any) {
    try {
      const { id, dto } = data;
      console.log('updateClinicForm data:', data);
      const result = await this.clinicService.updateClinicForm(id, dto);

      return {
        status: 'success',
        message: 'Cập nhật thông tin phòng khám thành công',
        data: result,
      };
    } catch (err) {
      handleRpcError('ClinicController.updateClinicForm', err);
    }
  }
}
