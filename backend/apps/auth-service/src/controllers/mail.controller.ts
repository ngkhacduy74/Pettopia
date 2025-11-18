import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { MailTemplateService } from '../services/mail.template.service';

@Controller()
export class MailController {
  constructor(private readonly mailService: MailTemplateService) {}

  @EventPattern({ cmd: 'invite_vet' })
  async inviteVet(@Payload() data: { email: string; clinic_id: string }) {
    await this.mailService.inviteVet(data.email, data.clinic_id);
  }

  @EventPattern({ cmd: 'sendClinicMemberInvitation' })
  async sendClinicMemberInvitation(
    @Payload()
    data: {
      email: string;
      clinicName: string;
      role: string;
      inviteLink: string;
      expiresAt: string;
    },
  ) {
    await this.mailService.sendClinicMemberInvitation(data);
  }
  
  @EventPattern({ cmd: 'sendClinicVerificationMail' })
  async sendClinicVerificationMail(@Payload() data: { clinic_id: string }) {
    await this.mailService.sendClinicVerificationMail(data.clinic_id);
  }

  @EventPattern({ cmd: 'sendClinicWelcomeEmail' })
  async sendClinicWelcomeEmail(
    @Payload()
    data: {
      email: string;
      clinicName: string;
      representativeName: string;
      username: string;
      password: string;
    },
  ) {
    await this.mailService.sendClinicWelcomeEmail(
      data.email,
      data.clinicName,
      data.representativeName,
      data.username,
      data.password,
    );
  }

  @EventPattern({ cmd: 'sendAppointmentConfirmation' })
  async sendAppointmentConfirmation(
    @Payload()
    data: {
      email: string;
      appointmentDetails: {
        userName: string;
        appointmentDate: string;
        appointmentTime: string;
        clinicName: string;
        clinicAddress:
          | string
          | {
              description: string;
              ward: string;
              district: string;
              city: string;
            };
        services: string[];
        appointmentId: string;
      };
    },
  ) {
    const { appointmentDetails } = data;

    const formattedAppointmentDetails = {
      ...appointmentDetails,
      clinicAddress:
        typeof appointmentDetails.clinicAddress === 'string'
          ? {
              description: appointmentDetails.clinicAddress,
              ward: '',
              district: '',
              city: '',
            }
          : appointmentDetails.clinicAddress,
    };

    await this.mailService.sendAppointmentConfirmation(
      data.email,
      formattedAppointmentDetails,
    );
  }

  @EventPattern({ cmd: 'sendAppointmentStatusUpdate' })
  async sendAppointmentStatusUpdate(
    @Payload()
    data: {
      email: string;
      appointmentDetails: {
        userName: string;
        appointmentDate: string;
        appointmentTime: string;
        clinicName: string;
        clinicAddress:
          | string
          | {
              description: string;
              ward: string;
              district: string;
              city: string;
            };
        services: string[];
        appointmentId: string;
        status: string;
      };
    },
  ) {
    const { appointmentDetails } = data;

    const formattedAppointmentDetails = {
      ...appointmentDetails,
      clinicAddress:
        typeof appointmentDetails.clinicAddress === 'string'
          ? {
              description: appointmentDetails.clinicAddress,
              ward: '',
              district: '',
              city: '',
            }
          : appointmentDetails.clinicAddress,
    };

    await this.mailService.sendAppointmentStatusUpdate(
      data.email,
      formattedAppointmentDetails,
    );
  }

  @EventPattern({ cmd: 'sendAppointmentCancellation' })
  async sendAppointmentCancellation(
    @Payload()
    data: {
      email: string;
      appointmentDetails: {
        userName: string;
        appointmentDate: string;
        appointmentTime: string;
        clinicName: string;
        clinicAddress:
          | string
          | {
              description: string;
              ward: string;
              district: string;
              city: string;
            };
        services: string[];
        appointmentId: string;
        cancelReason: string;
      };
    },
  ) {
    const { appointmentDetails } = data;

    const formattedAppointmentDetails = {
      ...appointmentDetails,
      clinicAddress:
        typeof appointmentDetails.clinicAddress === 'string'
          ? {
              description: appointmentDetails.clinicAddress,
              ward: '',
              district: '',
              city: '',
            }
          : appointmentDetails.clinicAddress,
    };

    await this.mailService.sendAppointmentCancellation(
      data.email,
      formattedAppointmentDetails,
    );
  }
}