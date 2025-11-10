import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MailTemplateService } from '../services/mail.template.service';

@Controller()
export class MailController {
  constructor(private readonly mailService: MailTemplateService) {}

  @MessagePattern({ cmd: 'invite_vet' })
  async inviteVet(@Payload() data: { email: string; clinic_id: string }) {
    return this.mailService.inviteVet(data.email, data.clinic_id);
  }
  @MessagePattern({ cmd: 'sendClinicVerificationMail' })
  async sendClinicVerificationMail(@Payload() data: { clinic_id: string }) {
    return this.mailService.sendClinicVerificationMail(data.clinic_id);
  }

  @MessagePattern({ cmd: 'sendClinicWelcomeEmail' })
  async sendClinicWelcomeEmail(
    @Payload()
    data: {
      email: string;
      clinicName: string;
      representativeName: string;
      username: string;
      password: string;
    }
  ) {
    return this.mailService.sendClinicWelcomeEmail(
      data.email,
      data.clinicName,
      data.representativeName,
      data.username,
      data.password
    );
  }

  @MessagePattern({ cmd: 'sendAppointmentConfirmation' })
  async sendAppointmentConfirmation(
    @Payload() 
    data: { 
      email: string; 
      appointmentDetails: {
        userName: string;
        appointmentDate: string;
        appointmentTime: string;
        clinicName: string;
        clinicAddress: string | {
          description: string;
          ward: string;
          district: string;
          city: string;
        };
        services: string[];
        appointmentId: string;
      } 
    }
  ) {
    const { appointmentDetails } = data;
    

    const formattedAppointmentDetails = {
      ...appointmentDetails,
      clinicAddress: typeof appointmentDetails.clinicAddress === 'string' 
        ? {
            description: appointmentDetails.clinicAddress,
            ward: '',
            district: '',
            city: ''
          }
        : appointmentDetails.clinicAddress
    };

    return this.mailService.sendAppointmentConfirmation(
      data.email, 
      formattedAppointmentDetails
    );
  }
}
