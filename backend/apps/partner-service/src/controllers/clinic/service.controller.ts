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
}
