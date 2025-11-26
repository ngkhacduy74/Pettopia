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

    console.log('✅ Tạo lời mời thành công:', {
      id: invitation.id,
      email: invited_email,
      role: normalizedRole,
      clinic: clinic.clinic_name,
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

    console.log('📋 Invitation status:', invitation.status);
    console.log('📋 Invitation role:', invitation.role);
    console.log('📋 Invitation clinic_id:', invitation.clinic_id);

    if (invitation.status !== ClinicInvitationStatus.PENDING) {
      throw new BadRequestException(
        `Lời mời đã được ${invitation.status === ClinicInvitationStatus.ACCEPTED ? 'chấp nhận' : 'từ chối'} rồi.`,
      );
    }

    if (invitation.expires_at.getTime() < Date.now()) {
      await this.clinicInvitationRepository.cancelPendingInvitation(
        invitation.id,
      );
      throw new BadRequestException('Lời mời đã hết hạn.');
    }

    let vet = await this.vetRepository.findVetById(vet_id);
    console.log('⚠️  Vet info khi accept invitation:', vet);
    console.log('📋 Invitation role đang được accept:', invitation.role);
    console.log('📋 Invitation clinic_id:', invitation.clinic_id);

    // Kiểm tra xem vet đã có CHÍNH XÁC role này tại clinic này chưa
    if (vet && vet.clinic_roles && vet.clinic_roles.length > 0) {
      const hasExactRole = vet.clinic_roles.find(
        (cr: any) =>
          cr.clinic_id === invitation.clinic_id && cr.role === invitation.role,
      );

      if (hasExactRole) {
        throw new BadRequestException(
          `Bạn đã có vai trò "${invitation.role}" tại phòng khám này rồi.`,
        );
      }
    }

    // Nếu chưa có vet record, tạo mới (minimal record)
    if (!vet) {
      console.log('⚠️  Vet record chưa tồn tại, tạo mới với id:', vet_id);
      const newVetData = {
        id: vet_id,
        is_active: true,
        specialty: 'Chuyên khoa chưa xác định',
        subSpecialties: [],
        exp: 0,
        license_number: `TMP-${vet_id.substring(0, 8)}`,
        clinic_roles: [
          {
            clinic_id: invitation.clinic_id,
            role: invitation.role,
            joined_at: new Date(),
          },
        ],
        clinic_id: [invitation.clinic_id],
      };
      vet = await this.vetRepository.createVet(newVetData);
      console.log('✅ Tạo vet record mới thành công:', vet_id);
    } else {
      // Nếu đã có vet, thêm clinic_role vào
      await this.vetRepository.addClinicToVet(
        vet_id,
        invitation.clinic_id,
        invitation.role,
      );
      console.log('✅ Thêm clinic_role vào vet hiện tại:', vet_id);
    }

    // Thêm member vào clinic
    await this.clinicsRepository.addMemberToClinic(
      invitation.clinic_id,
      vet_id,
    );

    await this.clinicInvitationRepository.markAsAccepted(invitation.id, vet_id);

    console.log('✅ Accept invitation hoàn tất:', {
      vet_id,
      clinic_id: invitation.clinic_id,
      role: invitation.role,
    });

    return {
      message: 'Bạn đã tham gia phòng khám thành công.',
      vet_id: vet_id,
      role: invitation.role,
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
