import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { ClinicInvitationRepository } from 'src/repositories/clinic/clinic-invitation.repository';
import { ClinicsRepository } from 'src/repositories/clinic/clinic.repositories';
import { VetRepository } from 'src/repositories/vet/vet.repositories';
import {
  ClinicInvitationRole,
  ClinicInvitationStatus,
} from 'src/schemas/clinic/clinic-invitation.schema';
import { createRpcError } from 'src/common/error.detail';

interface CreateClinicInvitationPayload {
  clinic_id: string;
  invited_email: string;
  role: ClinicInvitationRole | string;
  invited_by?: string;
}

interface AcceptClinicInvitationPayload {
  token: string;
  vet_id: string;
}

interface DeclineClinicInvitationPayload {
  token: string;
}

@Injectable()
export class ClinicInvitationService {
  private readonly invitationTtlHours = Number(
    process.env.CLINIC_INVITATION_TTL_HOURS ?? 24 * 7,
  );

  constructor(
    private readonly clinicInvitationRepository: ClinicInvitationRepository,
    private readonly clinicsRepository: ClinicsRepository,
    private readonly vetRepository: VetRepository,
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
  ) {}

  async createInvitation(payload: CreateClinicInvitationPayload) {
    const { clinic_id, invited_email, role, invited_by } = payload;

    if (!clinic_id) {
      throw new BadRequestException('Thiếu mã phòng khám.');
    }

    if (!invited_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invited_email)) {
      throw new BadRequestException('Email lời mời không hợp lệ.');
    }

    const normalizedRole = this.normalizeRole(role);

    const clinic = await this.clinicsRepository.getClinicById(clinic_id);
    if (!clinic) {
      throw new NotFoundException('Không tìm thấy thông tin phòng khám.');
    }

    const existingPendingInvitation =
      await this.clinicInvitationRepository.findPendingByClinicAndEmail(
        clinic_id,
        invited_email.toLowerCase(),
      );

    if (existingPendingInvitation) {
      const stillValid =
        existingPendingInvitation.expires_at &&
        existingPendingInvitation.expires_at.getTime() > Date.now();
      if (stillValid) {
        throw new BadRequestException(
          'Đã tồn tại lời mời đang chờ xử lý cho email này.',
        );
      }
    }

    const invitationId = uuid();
    const token = uuid();
    const expiresAt = new Date(
      Date.now() + this.invitationTtlHours * 60 * 60 * 1000,
    );

    const invitation = await this.clinicInvitationRepository.createInvitation({
      id: invitationId,
      clinic_id,
      invited_email: invited_email.toLowerCase(),
      role: normalizedRole,
      token,
      invited_by,
      expires_at: expiresAt,
      status: ClinicInvitationStatus.PENDING,
    });

    try {
      const baseUrl = process.env.APP_URL || 'http://localhost:3333';

      this.authService.emit(
        { cmd: 'sendClinicMemberInvitation' },
        {
          email: invited_email,
          clinicName: clinic.clinic_name,
          role: normalizedRole,
          inviteLink: `${baseUrl}/api/v1/partner/clinic/invitations/${token}/accept`,
          expiresAt: expiresAt.toLocaleDateString('vi-VN'),
        },
      );
    } catch (error) {
      await this.clinicInvitationRepository.cancelPendingInvitation(
        invitation.id,
      );
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Không thể gửi email lời mời.',
        'Internal Server Error',
        error?.message,
      );
    }

    return {
      message: 'Đã tạo lời mời thành công.',
      data: {
        id: invitation.id,
        token: invitation.token,
        expires_at: invitation.expires_at,
      },
    };
  }

  async acceptInvitation(payload: AcceptClinicInvitationPayload) {
    const { token, vet_id } = payload;

    if (!token) {
      throw new BadRequestException('Thiếu token lời mời.');
    }

    if (!vet_id) {
      throw new BadRequestException('Thiếu mã bác sĩ.');
    }

    const invitation = await this.clinicInvitationRepository.findByToken(token);

    if (!invitation) {
      throw new NotFoundException('Không tìm thấy lời mời.');
    }

    if (invitation.status !== ClinicInvitationStatus.PENDING) {
      throw new BadRequestException('Lời mời đã được xử lý.');
    }

    if (invitation.expires_at.getTime() < Date.now()) {
      await this.clinicInvitationRepository.cancelPendingInvitation(
        invitation.id,
      );
      throw new BadRequestException('Lời mời đã hết hạn.');
    }

    const vet = await this.vetRepository.findVetById(vet_id);

    if (!vet) {
      throw new BadRequestException(
        'Bạn chưa hoàn tất hồ sơ bác sĩ để nhận lời mời.',
      );
    }

    await Promise.all([
      this.clinicsRepository.addMemberToClinic(invitation.clinic_id, vet_id),
      this.vetRepository.addClinicToVet(vet_id, invitation.clinic_id),
    ]);

    await this.clinicInvitationRepository.markAsAccepted(invitation.id, vet_id);

    return {
      message: 'Bạn đã tham gia phòng khám thành công.',
    };
  }

  async declineInvitation(payload: DeclineClinicInvitationPayload) {
    const { token } = payload;

    if (!token) {
      throw new BadRequestException('Thiếu token lời mời.');
    }

    const invitation = await this.clinicInvitationRepository.findByToken(token);

    if (!invitation) {
      throw new NotFoundException('Không tìm thấy lời mời.');
    }

    if (invitation.status !== ClinicInvitationStatus.PENDING) {
      throw new BadRequestException('Lời mời đã được xử lý.');
    }

    await this.clinicInvitationRepository.markAsDeclined(invitation.id);

    return {
      message: 'Bạn đã từ chối lời mời.',
    };
  }

  private normalizeRole(
    role: ClinicInvitationRole | string,
  ): ClinicInvitationRole {
    const normalized = role?.toString().toLowerCase();
    switch (normalized) {
      case ClinicInvitationRole.VET:
      case 'bác sĩ':
        return ClinicInvitationRole.VET;
      case ClinicInvitationRole.RECEPTIONIST:
      case 'lễ tân':
        return ClinicInvitationRole.RECEPTIONIST;
      case ClinicInvitationRole.MANAGER:
      case 'quản lý':
        return ClinicInvitationRole.MANAGER;
      default:
        return ClinicInvitationRole.STAFF;
    }
  }
}
