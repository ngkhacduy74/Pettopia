import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MailTemplateService } from '../services/mail.template.service';

@Controller()
export class InviteController {
  constructor(private readonly mailService: MailTemplateService) {}

  @MessagePattern({ cmd: 'invite_vet' })
  async inviteVet(@Payload() data: { email: string; clinic_id: string }) {
    console.log('oqj2eq2', data);
    return this.mailService.inviteVet(data.email, data.clinic_id);
  }

  //   @MessagePattern({ cmd: 'accept_invite' })
  //   async acceptInvite(@Payload() data: { token: string }) {
  //     const userRepo = {
  //       findByEmail: async (email: string) => {
  //         return null;
  //       },
  //       create: async (data) => {
  //         return data;
  //       },
  //       save: async (user) => {
  //         return user;
  //       },
  //     };

  //     return this.inviteService.acceptInvite(data.token, userRepo);
  //   }
}
