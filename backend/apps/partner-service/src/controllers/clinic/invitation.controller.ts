import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClinicInvitationService } from 'src/services/clinic/clinic-invitation.service';
import { handleRpcError } from 'src/common/error.detail';
import { ClinicInvitationRole } from 'src/schemas/clinic/clinic-invitation.schema';

@Controller()
export class ClinicInvitationController {
  constructor(
    private readonly clinicInvitationService: ClinicInvitationService,
  ) {}

  @MessagePattern({ cmd: 'createClinicMemberInvitation' })
  async createClinicMemberInvitation(
    @Payload()
    data: {
      clinic_id: string;
      invited_email: string;
      role: ClinicInvitationRole | string;
      invited_by?: string;
    },
  ) {
    try {
      return await this.clinicInvitationService.createInvitation(data);
    } catch (error) {
      handleRpcError(
        'ClinicInvitationController.createClinicMemberInvitation',
        error,
      );
    }
  }

  @MessagePattern({ cmd: 'acceptClinicMemberInvitation' })
  async acceptClinicMemberInvitation(
    @Payload() data: { token: string; vet_id: string },
  ) {
    try {
      return await this.clinicInvitationService.acceptInvitation(data);
    } catch (error) {
      handleRpcError(
        'ClinicInvitationController.acceptClinicMemberInvitation',
        error,
      );
    }
  }

  @MessagePattern({ cmd: 'declineClinicMemberInvitation' })
  async declineClinicMemberInvitation(@Payload() data: { token: string }) {
    try {
      return await this.clinicInvitationService.declineInvitation(data);
    } catch (error) {
      handleRpcError(
        'ClinicInvitationController.declineClinicMemberInvitation',
        error,
      );
    }
  }
}
