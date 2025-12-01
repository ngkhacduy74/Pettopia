import { HttpStatus, Inject, Injectable } from '@nestjs/common';
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
  // Thời gian sống của lời mời (giờ)
  private readonly invitationTtlHours = Number(
    process.env.CLINIC_INVITATION_TTL_HOURS ?? 24 * 7,
  );

  constructor(
    private readonly clinicInvitationRepository: ClinicInvitationRepository,
    private readonly clinicsRepository: ClinicsRepository,
    private readonly vetRepository: VetRepository,

    // Dùng client đã được đăng ký sẵn trong AppModule (ClientsModule.registerAsync)
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
    @Inject('CUSTOMER_SERVICE') private readonly customerService: ClientProxy,
  ) { }

  async createInvitation(payload: CreateClinicInvitationPayload) {
    const { clinic_id, invited_email, role, invited_by } = payload;
    console.log('createInvitation payload:', payload);

    // 1. Validate input
    if (!clinic_id) {
      throw createRpcError(
        HttpStatus.BAD_REQUEST,
        'Thiếu mã phòng khám.',
        'Bad Request',
      );
    }

    if (
      !invited_email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invited_email)
    ) {
      throw createRpcError(
        HttpStatus.BAD_REQUEST,
        'Email lời mời không hợp lệ.',
        'Bad Request',
      );
    }

    const normalizedRole = this.normalizeRole(role);

    // 1.1 Check if email belongs to a Clinic account
    try {
      const user = await lastValueFrom(
        this.customerService.send(
          { cmd: 'getUserByEmail' },
          { email_address: invited_email },
        ),
      ).catch(() => null);

      if (user && user.role && user.role.includes('Clinic')) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Không thể mời tài khoản phòng khám khác.',
          'Bad Request',
        );
      }
    } catch (error) {
      if (error?.message === 'Không thể mời tài khoản phòng khám khác.') {
        throw error;
      }
      // Ignore other errors (e.g. user not found or service unavailable)
      console.warn(
        `[ClinicInvitationService] Failed to check user role for ${invited_email}:`,
        error?.message,
      );
    }

    // 2. Kiểm tra clinic có tồn tại không
    const clinic = await this.clinicsRepository.getClinicById(clinic_id);
    if (!clinic) {
      throw createRpcError(
        HttpStatus.NOT_FOUND,
        'Không tìm thấy thông tin phòng khám.',
        'Not Found',
      );
    }

    // 3. Kiểm tra đã có pending invitation cho email này chưa
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
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Đã tồn tại lời mời đang chờ xử lý cho email này.',
          'Bad Request',
        );
      }
    }

    // 4. Tạo mới invitation trong DB
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


      await lastValueFrom(
        this.authService.send(
          { cmd: 'sendClinicMemberInvitation' },
          {
            email: invited_email,
            clinicName: clinic.clinic_name,
            role: normalizedRole,
            inviteLink: `${process.env.APP_URL}/vet/${token}/accepted`,
            expiresAt: expiresAt.toISOString(),
          },
        ),
      );

      console.log(
        '[ClinicInvitationService] Invitation email sent successfully.',
      );
    } catch (error: any) {

      console.error(
        '[ClinicInvitationService] Error sending invitation email:',
        {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
        },
      );

      // Nếu muốn debug kỹ hơn:
      if (error?.message === 'The client is closed') {
        console.error(
          '[ClinicInvitationService] AUTH_SERVICE RMQ client is closed. Kiểm tra lại queue, RMQ_URL hoặc auth-service container.',
        );
      }


    }

    return {
      status: 'success',
      message: 'Đã tạo lời mời thành công.',
      data: {
        id: invitation.id,
        token: invitation.token,
        expires_at: invitation.expires_at,
      },
    };
  }

  // ================== CHẤP NHẬN LỜI MỜI ==================
  async acceptInvitation(payload: AcceptClinicInvitationPayload) {
    const { token, vet_id } = payload;

    if (!token) {
      throw createRpcError(
        HttpStatus.BAD_REQUEST,
        'Thiếu token lời mời.',
        'Bad Request',
      );
    }

    if (!vet_id) {
      throw createRpcError(
        HttpStatus.BAD_REQUEST,
        'Thiếu mã bác sĩ.',
        'Bad Request',
      );
    }

    const invitation = await this.clinicInvitationRepository.findByToken(token);

    if (!invitation) {
      throw createRpcError(
        HttpStatus.NOT_FOUND,
        'Không tìm thấy lời mời.',
        'Not Found',
      );
    }

    if (invitation.status !== ClinicInvitationStatus.PENDING) {
      throw createRpcError(
        HttpStatus.BAD_REQUEST,
        'Lời mời đã được xử lý.',
        'Bad Request',
      );
    }

    if (invitation.expires_at.getTime() < Date.now()) {
      await this.clinicInvitationRepository.cancelPendingInvitation(
        invitation.id,
      );
      throw createRpcError(
        HttpStatus.BAD_REQUEST,
        'Lời mời đã hết hạn.',
        'Bad Request',
      );
    }

    const vet = await this.vetRepository.findVetById(vet_id);

    if (!vet) {
      throw createRpcError(
        HttpStatus.BAD_REQUEST,
        'Bạn chưa hoàn tất hồ sơ bác sĩ để nhận lời mời.',
        'Bad Request',
      );
    }

    await Promise.all([
      this.clinicsRepository.addMemberToClinic(invitation.clinic_id, vet_id),
      this.vetRepository.addClinicToVet(vet_id, invitation.clinic_id),
    ]);

    await this.clinicInvitationRepository.markAsAccepted(invitation.id, vet_id);

    return {
      status: 'success',
      message: 'Bạn đã tham gia phòng khám thành công.',
    };
  }

  // ================== TỪ CHỐI LỜI MỜI ==================
  async declineInvitation(payload: DeclineClinicInvitationPayload) {
    const { token } = payload;

    if (!token) {
      throw createRpcError(
        HttpStatus.BAD_REQUEST,
        'Thiếu token lời mời.',
        'Bad Request',
      );
    }

    const invitation = await this.clinicInvitationRepository.findByToken(token);

    if (!invitation) {
      throw createRpcError(
        HttpStatus.NOT_FOUND,
        'Không tìm thấy lời mời.',
        'Not Found',
      );
    }

    if (invitation.status !== ClinicInvitationStatus.PENDING) {
      throw createRpcError(
        HttpStatus.BAD_REQUEST,
        'Lời mời đã được xử lý.',
        'Bad Request',
      );
    }

    await this.clinicInvitationRepository.markAsDeclined(invitation.id);

    return {
      status: 'success',
      message: 'Bạn đã từ chối lời mời.',
    };
  }

  // ================== HELPER ==================
  private normalizeRole(
    role: ClinicInvitationRole | string,
  ): ClinicInvitationRole {
    const normalized = role?.toString().toLowerCase().trim();
    switch (normalized) {
      case ClinicInvitationRole.VET:
      case 'vet':
      case 'bác sĩ':
        return ClinicInvitationRole.VET;

      case ClinicInvitationRole.RECEPTIONIST:
      case 'receptionist':
      case 'lễ tân':
        return ClinicInvitationRole.RECEPTIONIST;

      case ClinicInvitationRole.MANAGER:
      case 'manager':
      case 'quản lý':
        return ClinicInvitationRole.MANAGER;

      default:
        return ClinicInvitationRole.STAFF;
    }
  }
}
