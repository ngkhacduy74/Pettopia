import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VetInviteToken,
  VetInviteTokenDocument,
  VetInviteTokenStatus,
} from 'src/schemas/vet.inviteToken';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from './mail.services';
import { MailType } from 'src/schemas/mail.schema';
import { VetInviteRepository } from 'src/repositories/invite.repositories';

@Injectable()
export class InviteService {
  constructor(
    @InjectModel(VetInviteToken.name)
    private vetInviteModel: Model<VetInviteTokenDocument>,
    private readonly mailService: MailService,
    private readonly vetInviteRepositories: VetInviteRepository,
  ) {}

  async inviteVet(email: string, clinic_id: string) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Email không hợp lệ.');
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const inviteLink = `${process.env.APP_URL}/auth/accept-invite?token=${token}`;

    await this.vetInviteRepositories.createInvite(
      email,
      clinic_id,
      token,
      expiresAt,
    );
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
        <h2 style="color:#1a73e8;">📩 Lời mời trở thành bác sĩ thú y</h2>
        <p>Xin chào,</p>
        <p>Bạn được mời tham gia làm việc tại bệnh viện thú y của chúng tôi.</p>
        <p>Vui lòng xác nhận lời mời bằng cách nhấn vào nút dưới đây:</p>
        <p>
          <a href="${inviteLink}" 
            style="background-color:#1a73e8;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;">
            ✅ Xác nhận lời mời
          </a>
        </p>
        <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email.</p>
        <p><i>Liên kết này sẽ hết hạn vào ngày ${expiresAt.toLocaleDateString('vi-VN')}.</i></p>
      </div>
    `;
    try {
      await this.mailService.sendMail(
        email,
        'Lời mời trở thành Bác sĩ thú y',
        html,
        MailType.INVITE_VET,
      );
    } catch (error) {
      console.error('Lỗi gửi mail mời Vet:', error.message);
      throw new BadRequestException('Không thể gửi mail mời Vet.');
    }

    return {
      message: 'Đã gửi mail mời Vet thành công!',
      token,
      expiresAt,
    };
  }

  //   async acceptInvite(
  //     token: string,
  //     userRepo,
  //     vetRepo,
  //     clinicRepo,
  //   ): Promise<any> {
  //     // Kiểm tra token
  //     const invite = await this.vetInviteModel.findOne({ token });
  //     if (!invite) throw new BadRequestException('Token không hợp lệ');
  //     if (invite.status !== VetInviteTokenStatus.PENDING)
  //       throw new BadRequestException('Lời mời đã được sử dụng hoặc hết hạn');
  //     if (invite.expires_at < new Date())
  //       throw new BadRequestException('Lời mời đã hết hạn');
  //     invite.status = VetInviteTokenStatus.ACCEPTED;
  //     await invite.save();
  //     let user = await userRepo.findByEmail(invite.email);
  //     if (!user) {
  //       user = await userRepo.create({
  //         email: invite.email,
  //         role: 'VET',
  //         is_active: true,
  //       });
  //       await userRepo.save(user);
  //     }

  //     let vet = await vetRepo.findByUserId(user.id);
  //     if (!vet) {
  //       vet = await vetRepo.create({
  //         user_id: user.id,
  //         veterinarians_email: user.email,
  //         clinic_id: invite.clinic_id,
  //         status: 'Active',
  //       });
  //       await vetRepo.save(vet);
  //       return {
  //         message: 'Đã xác nhận lời mời! Bạn đã trở thành Vet trong bệnh viện.',
  //       };
  //     }
  //     if (vet.clinic_id === invite.clinic_id) {
  //       return { message: 'Bạn đã là bác sĩ trong bệnh viện này!' };
  //     }
  //     vet.clinic_id = invite.clinic_id;
  //     await vetRepo.save(vet);

  //     return { message: 'Bạn đã được chuyển sang bệnh viện mới!' };
  //   }
}
