import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VetInviteToken,
  VetInviteTokenDocument,
  VetInviteTokenStatus,
} from 'src/schemas/vet.inviteToken';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from './mail.service';
import { MailType } from 'src/schemas/mail.schema';
import { VetInviteRepository } from 'src/repositories/invite.repositories';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class MailTemplateService {
  constructor(
    @InjectModel(VetInviteToken.name)
    private vetInviteModel: Model<VetInviteTokenDocument>,
    private readonly mailService: MailService,
    private readonly vetInviteRepositories: VetInviteRepository,
    @Inject('PARTNER_SERVICE') private readonly partnerService: ClientProxy,
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

  async sendClinicVerificationMail(clinic_id: string) {
    const clinic = await lastValueFrom(
      this.partnerService.send({ cmd: 'getClinicFormById' }, { id: clinic_id }),
    );
    console.log('oljhaksdjhas', clinic);
    console.log('emaialsda', clinic.data.representative.email.email_address);
    if (!clinic)
      throw new BadRequestException('Không tìm thấy thông tin phòng khám.');

    // Tạo token xác minh
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    clinic.verification_token = token;
    clinic.token_expires_at = expiresAt;

    const verifyLink = `${process.env.APP_URL}/verify-clinic?token=${token}`;

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;line-height:1.8;color:#333;background-color:#f9fafb;padding:20px;border-radius:10px;">
        <div style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <h2 style="color:#1a73e8;text-align:center;">🏥 Thư xác minh thông tin phòng khám</h2>
          <p>Kính gửi <strong>Quý đại diện phòng khám ${clinic.data.clinic_name}</strong>,</p>

          <p>Trước hết, chúng tôi xin gửi lời chào trân trọng và cảm ơn Quý phòng khám đã tin tưởng đăng ký tham gia hệ thống quản lý y tế của chúng tôi.</p>

          <p>Để hoàn tất quá trình đăng ký, Quý đại diện vui lòng xác nhận thông tin phòng khám bằng cách nhấn vào nút bên dưới:</p>

          <div style="text-align:center;margin:25px 0;">
            <a href="${verifyLink}" 
               style="background-color:#1a73e8;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                XÁC NHẬN THÔNG TIN PHÒNG KHÁM
            </a>
          </div>

          <p>Sau khi xác nhận, hệ thống sẽ tự động cập nhật trạng thái đăng ký của phòng khám và gửi thông báo cho đội ngũ quản lý để tiếp tục quy trình xét duyệt.</p>

          <p>Nếu Quý vị chưa từng gửi yêu cầu đăng ký này hoặc nhận được email này do nhầm lẫn, vui lòng <strong>không nhấn vào liên kết</strong> và thông báo lại cho chúng tôi qua địa chỉ email hỗ trợ bên dưới.</p>

          <p style="margin-top:30px;">Xin chân thành cảm ơn sự hợp tác của Quý phòng khám.</p>

          <p style="color:#555;font-size:15px;">
            Trân trọng,<br>
            <strong>Phòng Quản lý Hệ thống</strong><br>
            Hệ thống quản lý y tế điện tử<br>
            📧 Email hỗ trợ: <a href="mailto:support@yourdomain.com">support@yourdomain.com</a><br>
            🌐 Website: <a href="https://yourdomain.com">https://yourdomain.com</a>
          </p>

          <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
          <p style="font-size:13px;color:#888;text-align:center;">
            Liên kết xác minh này có hiệu lực trong vòng <strong>07 ngày</strong> kể từ khi email được gửi đi.
          </p>
        </div>
      </div>
    `;

    try {
      await this.mailService.sendMail(
        clinic.data.representative.email.email_address,
        `Xác minh thông tin phòng khám ${clinic.clinic_name}`,
        html,
        MailType.REMIND,
      );

      return {
        message: `Đã gửi email xác minh tới ${clinic.data.representative.email.email_address}`,
        token,
        expiresAt,
        verifyLink,
      };
    } catch (error) {
      console.error('Lỗi gửi mail xác minh:', error.message);
      throw new BadRequestException('Không thể gửi mail xác minh.');
    }
  }
}
