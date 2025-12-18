import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';

import { ClinicService } from '../../services/clinic/clinic.service';

import { MessagePattern, Payload, RpcException, EventPattern } from '@nestjs/microservices';
import { handleRpcError, createRpcError } from 'src/common/error.detail';
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
  constructor(private readonly clinicService: ClinicService) { }

  @MessagePattern({ cmd: 'getAllClinicForm' })
  async getAllClinicForm(
    @Payload() data: { page: number; limit: number; status?: string },
  ): Promise<any> {
    try {
      const result = await this.clinicService.findAllClinicForm(
        data.page,
        data.limit,
        data.status,
      );
      return result;
    } catch (err) {
      handleRpcError('ClinicController.getAllClinicForm', err);
    }
  }

  @MessagePattern({ cmd: 'registerClinic' })
  async createClinicForm(@Payload() CreateClinicFormData: any) {
    try {
      console.log('registerClinic123', CreateClinicFormData);
      return await this.clinicService.createClinicForm(CreateClinicFormData);
    } catch (err) {
      console.error('🔥🔥🔥 LỖI THỰC SỰ TẠI SERVICE:', err);
      throw createRpcError(
        err.status || err.statusCode || 500,
        err.message || 'Lỗi khi đăng ký phòng khám',
        'ClinicRegisterError',
        err
      );
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
  ) {
    try {
      return await this.clinicService.updateStatusClincForm(updateStatus);
    } catch (err) {
      handleRpcError('ClinicController.updateStatusClinicForm', err);
    }
  }

  @MessagePattern({ cmd: 'updateClinicActiveStatus' })
  async updateClinicActiveStatus(
    @Payload() data: { id: string; is_active: boolean },
  ) {
    try {
      return await this.clinicService.updateClinicActiveStatus(
        data.id,
        data.is_active,
      );
    } catch (err) {
      throw handleRpcError('ClinicController.updateClinicActiveStatus', err);
    }
  }


  @MessagePattern({ cmd: 'findAllClinic' })
  async findAllClinic(
    @Payload()
    data: {
      page?: number;
      limit?: number;
      isAdminOrStaff?: boolean;
    },
  ): Promise<any> {
    try {
      const result = await this.clinicService.findAllClinic(
        data.page,
        data.limit,
        data.isAdminOrStaff,
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

  @MessagePattern({ cmd: 'updateClinicForm' })
  async updateClinicForm(@Payload() data: any) {
    try {
      const { id, dto } = data;
      console.log('updateClinicForm data:', data);
      return await this.clinicService.updateClinicForm(id, dto);
    } catch (err) {
      handleRpcError('ClinicController.updateClinicForm', err);
    }
  }

  @MessagePattern({ cmd: 'getClinicMembers' })
  async getClinicMembers(@Payload() data: { clinic_id: string }): Promise<any> {
    try {
      const result = await this.clinicService.getClinicMembers(data.clinic_id);
      return result;
    } catch (err) {
      handleRpcError('ClinicController.getClinicMembers', err);
    }
  }
  @MessagePattern({ cmd: 'removeMemberFromClinic' })
  async removeMemberFromClinic(
    @Payload() data: { clinicId: string; memberId: string },
  ): Promise<any> {
    try {
      const result = await this.clinicService.removeMember(
        data.clinicId,
        data.memberId,
      );
      return result;
    } catch (err) {
      handleRpcError('ClinicController.removeMemberFromClinic', err);
    }
  }
  @MessagePattern({ cmd: 'updateClinicInfo' })
  async updateClinicInfo(@Payload() data: any): Promise<any> {
    try {
      const result = await this.clinicService.updateClinicInfo(data);
      return result;
    } catch (err) {
      handleRpcError('ClinicController.updateClinicInfo', err);
    }
  }
}
