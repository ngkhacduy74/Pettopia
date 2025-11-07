import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MailTemplateService } from '../services/mail.template.service';

@Controller()
export class MailController {
  constructor(private readonly mailService: MailTemplateService) {}

  @MessagePattern({ cmd: 'invite_vet' })
  async inviteVet(@Payload() data: { email: string; clinic_id: string }) {
    console.log('oqj2eq2', data);
    return this.mailService.inviteVet(data.email, data.clinic_id);
  }
  @MessagePattern({ cmd: 'sendClinicVerificationMail' })
  async sendClinicVerificationMail(@Payload() data: { clinic_id: string }) {
    console.log('📨 Gửi mail xác minh phòng khám:', data.clinic_id);
    return this.mailService.sendClinicVerificationMail(data.clinic_id);
  }
}
