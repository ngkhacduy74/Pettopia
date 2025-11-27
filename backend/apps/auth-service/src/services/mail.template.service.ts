import {
  Injectable,
  BadRequestException,
  Inject,
  HttpStatus,
} from '@nestjs/common';
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
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { createRpcError } from 'src/common/error.detail';

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

    await this.vetInviteRepositories
      .createInvite(email, clinic_id, token, expiresAt)
      .catch((err) => {
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Lỗi tạo lời mời Vet.',
          'Internal Server Error',
          err.message,
        );
      });
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
      await this.mailService
        .sendMail(
          email,
          'Lời mời trở thành Bác sĩ thú y',
          html,
          MailType.INVITE_VET,
        )
        .catch((err) => {
          throw createRpcError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            'Lỗi gửi mail mời Vet.',
            'Internal Server Error',
            err.message,
          );
        });
    } catch (error) {
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Không thể gửi mail mời Vet.',
        'Internal Server Error',
      );
    }

    return {
      message: 'Đã gửi mail mời Vet thành công!',
      token,
      expiresAt,
    };
  }

  async sendClinicMemberInvitation(params: {
    email: string;
    clinicName: string;
    role: string;
    inviteLink: string;
    expiresAt: string;
  }) {
    const { email, clinicName, role, inviteLink, expiresAt } = params;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Email lời mời không hợp lệ.');
    }

    if (!inviteLink) {
      throw new BadRequestException('Thiếu đường dẫn xác nhận lời mời.');
    }

    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
    const roleLabel = this.translateRole(role);

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
        <h2 style="color:#1a73e8;">📩 Lời mời tham gia phòng khám ${clinicName}</h2>
        <p>Xin chào,</p>
        <p>Phòng khám <strong>${clinicName}</strong> đã mời bạn tham gia với vai trò <strong>${roleLabel}</strong>.</p>
        <p>Vui lòng xác nhận lời mời bằng cách nhấn vào nút dưới đây:</p>
        <p>
          <a href="${inviteLink}" 
            style="background-color:#1a73e8;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;">
             Chấp nhận lời mời
          </a>
        </p>
        <p>Nếu bạn không muốn tham gia, hãy bỏ qua email này hoặc chọn từ chối trong ứng dụng.</p>
        ${
          expiresAtDate
            ? `<p><i>Liên kết này sẽ hết hạn vào ngày ${expiresAtDate.toLocaleString(
                'vi-VN',
              )}.</i></p>`
            : ''
        }
        <p>Trân trọng,<br/>Đội ngũ PetTopia</p>
      </div>
    `;

    await this.mailService.sendMail(
      email,
      `Lời mời tham gia phòng khám ${clinicName}`,
      html,
      MailType.INVITE_VET,
    );

    return {
      message: 'Đã gửi email lời mời thành công.',
    };
  }

  private translateRole(role: string) {
    const normalized = (role || '').toLowerCase();
    switch (normalized) {
      case 'vet':
      case 'bác sĩ':
        return 'Bác sĩ';
      case 'receptionist':
      case 'lễ tân':
        return 'Lễ tân';
      case 'manager':
      case 'quản lý':
        return 'Quản lý';
      case 'staff':
      default:
        return 'Nhân viên';
    }
  }
  async sendClinicWelcomeEmail(
    email: string,
    clinicName: string,
    representativeName: string,
    username: string,
    password: string,
  ) {
    const welcomeTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xin chào quý phòng khám ${clinicName},</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản trên hệ thống Pettopia. Dưới đây là thông tin đăng nhập của bạn:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          
          <p><strong>Tên đăng nhập:</strong> ${username}</p>
          <p><strong>Mật khẩu:</strong> ${password}</p>
        </div>

        <p><strong>Lưu ý quan trọng:</strong></p>
        <ul>
          <li>Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu tiên để đảm bảo bảo mật.</li>
          <li>Để phòng khám của bạn được hiển thị trên hệ thống, vui lòng thực hiện các bước sau:</li>
          <ol>
            <li>Đăng nhập vào tài khoản</li>
            <li>Đăng ký ca làm việc (shifts) cho phòng khám</li>
            <li>Đăng ký các dịch vụ (services) mà phòng khám cung cấp</li>
          </ol>
          <li>Mọi thắc mắc xin vui lòng liên hệ bộ phận hỗ trợ qua email support@petopia.com</li>
        </ul>

        <p>Trân trọng,<br>Đội ngũ PetTopia</p>
      </div>
    `;
    console.log('đã chạy được vào mial');
    return this.mailService.sendMail(
      email,
      `Chào mừng ${clinicName} đến với PetTopia`,
      welcomeTemplate,
      MailType.REMIND,
    );
  }

  async sendUserWelcomeEmail(
    email: string,
    fullName: string,
    username: string,
    password: string,
  ) {
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #222; line-height: 1.6; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.06);">
        <div style="background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); padding: 24px 28px; color: #fff;">
          <h2 style="margin: 0; font-weight: 700;">Chào mừng đến với Pettopia! 🐾</h2>
          <p style="margin: 6px 0 0; opacity: 0.95;">Xin chào ${fullName || 'bạn'}, tài khoản của bạn đã được tạo thành công.</p>
        </div>

        <div style="padding: 24px 28px;">
          <p>Cảm ơn bạn đã tin tưởng và chọn <strong>Pettopia</strong>. Dưới đây là thông tin đăng nhập của bạn:</p>

          <div style="background: #f6f8ff; border: 1px solid #e4e8ff; border-radius: 8px; padding: 16px 18px; margin: 14px 0;">
            <p style="margin: 0;"><strong>Tên đăng nhập:</strong> ${username}</p>
            <p style="margin: 6px 0 0;"><strong>Mật khẩu:</strong> ${password}</p>
          </div>

          <p style="margin-top: 18px;"><strong>Lưu ý quan trọng:</strong></p>
          <ul style="padding-left: 18px; margin: 10px 0 0;">
            <li>Vui lòng <strong>đổi mật khẩu</strong> ngay sau lần đăng nhập đầu tiên.</li>
            <li><strong>Không chia sẻ</strong> thông tin đăng nhập cho bất kỳ ai.</li>
            <li>Bật <strong>xác thực email/OTP</strong> (nếu có) để tăng cường bảo mật.</li>
          </ul>

          <div style="margin-top: 20px;">
            <a href="${process.env.APP_URL || 'https://pettopia.app'}/login" style="display: inline-block; background: #2575fc; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">Đăng nhập ngay</a>
          </div>

          <p style="margin-top: 22px; color: #555;">Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email hoặc liên hệ hỗ trợ.</p>

          <p style="margin-top: 20px;">Trân trọng,<br><strong>Đội ngũ Pettopia</strong></p>
        </div>

        <div style="background: #fafbfc; color: #888; padding: 14px 18px; font-size: 12px; text-align: center; border-top: 1px solid #eee;">
          Đây là email tự động. Vui lòng không trả lời email này.<br>
          © ${new Date().getFullYear()} Pettopia. All rights reserved.
        </div>
      </div>
    `;

    return this.mailService.sendMail(
      email,
      'Chào mừng bạn đến với Pettopia 🎉',
      html,
      MailType.THANK_YOU,
    );
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
    if (!clinic)
      throw createRpcError(
        HttpStatus.NOT_FOUND,
        'Phòng khám không tồn tại.',
        'Not Found',
      );

    // Tạo token xác minh
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    clinic.data.verification_token = token;
    clinic.data.token_expires_at = expiresAt;
    const updatedClinic = await lastValueFrom(
      this.partnerService.send(
        { cmd: 'updateClinicFormByMail' },
        {
          id: clinic_id,
          verification_token: token,
          token_expires_at: expiresAt,
        },
      ),
    );
    if (!updatedClinic) {
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Cập nhật token xác minh thất bại.',
        'Internal Server Error',
      );
    }
    const verifyLink = `${process.env.APP_URL}/api/v1/auth/verify/clinic?token=${token}`;

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
      const send = await this.mailService
        .sendMail(
          clinic.data.representative.email.email_address,
          `Xác minh thông tin phòng khám ${clinic.data.clinic_name}`,
          html,
          MailType.REMIND,
        )
        .catch((err) => {
          throw createRpcError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            'Lỗi gửi mail xác minh phòng khám.',
            'Internal Server Error',
            err.message,
          );
        });

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

  async sendAppointmentConfirmation(
    email: string,
    appointmentDetails: {
      userName: string;
      appointmentDate: string;
      appointmentTime: string;
      clinicName: string;
      clinicAddress: {
        description: string;
        ward: string;
        district: string;
        city: string;
      };
      services: string[];
      appointmentId: string;
    },
  ) {
    const template =
      this.getAppointmentConfirmationTemplate(appointmentDetails);
    return this.mailService.sendMail(
      email,
      `Xác nhận đặt lịch hẹn thành công - ${appointmentDetails.appointmentId}`,
      template,
      MailType.REMIND,
    );
  }

  private getAppointmentConfirmationTemplate(data: {
    userName: string;
    appointmentDate: string;
    appointmentTime: string;
    clinicName: string;
    clinicAddress: {
      description: string;
      ward: string;
      district: string;
      city: string;
    };
    services: string[];
    appointmentId: string;
  }): string {
    const servicesList = data.services
      .map((service) => `<li>${service}</li>`)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Xác nhận đặt lịch hẹn thành công</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            padding: 20px;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 5px 5px;
          }
          .appointment-details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ĐẶT LỊCH HẸN THÀNH CÔNG</h1>
        </div>
        
        <div class="content">
          <p>Xin chào <strong>${data.userName}</strong>,</p>
          
          <p>Cảm ơn bạn đã đặt lịch hẹn tại <strong>${data.clinicName}</strong>.</p>
          
          <div class="appointment-details">
            <h3>THÔNG TIN ĐẶT LỊCH</h3>
            <p><strong>Mã đặt lịch:</strong> ${data.appointmentId}</p>
            <p><strong>Ngày hẹn:</strong> ${data.appointmentDate}</p>
            <p><strong>Ca khám:</strong> ${data.appointmentTime}</p>
            
            <h4>Địa điểm:</h4>
            <p>${data.clinicName}</p>
            <p>
              ${data.clinicAddress.description}, ${data.clinicAddress.ward}, ${data.clinicAddress.district}, ${data.clinicAddress.city}
            </p>
            
            <h4>Dịch vụ đã đặt:</h4>
            <ul>
              ${servicesList}
            </ul>
          </div>

          <p>Vui lòng đến đúng giờ để được phục vụ tốt nhất. Nếu có bất kỳ thay đổi nào, vui lòng liên hệ với chúng tôi trước ít nhất 2 giờ.</p>
          
          <p>Trân trọng,<br>Đội ngũ Pettopia</p>
          
          <div class="footer">
            <p>Đây là email tự động, vui lòng không trả lời email này.</p>
            <p>© ${new Date().getFullYear()} Pettopia. Tất cả các quyền được bảo lưu.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendAppointmentStatusUpdate(
    email: string,
    appointmentDetails: {
      userName: string;
      appointmentDate: string;
      appointmentTime: string;
      clinicName: string;
      clinicAddress: {
        description: string;
        ward: string;
        district: string;
        city: string;
      };
      services: string[];
      appointmentId: string;
      status: string;
    },
  ) {
    const template =
      this.getAppointmentStatusUpdateTemplate(appointmentDetails);
    return this.mailService.sendMail(
      email,
      `Cập nhật trạng thái lịch hẹn - ${appointmentDetails.appointmentId}`,
      template,
      MailType.REMIND,
    );
  }

  async sendAppointmentCancellation(
    email: string,
    appointmentDetails: {
      userName: string;
      appointmentDate: string;
      appointmentTime: string;
      clinicName: string;
      clinicAddress: {
        description: string;
        ward: string;
        district: string;
        city: string;
      };
      services: string[];
      appointmentId: string;
      cancelReason: string;
    },
  ) {
    const template =
      this.getAppointmentCancellationTemplate(appointmentDetails);
    return this.mailService.sendMail(
      email,
      `Thông báo hủy lịch hẹn - ${appointmentDetails.appointmentId}`,
      template,
      MailType.REMIND,
    );
  }

  private getAppointmentStatusUpdateTemplate(data: {
    userName: string;
    appointmentDate: string;
    appointmentTime: string;
    clinicName: string;
    clinicAddress: {
      description: string;
      ward: string;
      district: string;
      city: string;
    };
    services: string[];
    appointmentId: string;
    status: string;
  }): string {
    const servicesList = data.services
      .map((service) => `<li>${service}</li>`)
      .join('');

    const getStatusColor = (status: string) => {
      if (status.includes('xác nhận')) return '#2196F3';
      if (status.includes('hoàn thành')) return '#4CAF50';
      if (status.includes('hủy')) return '#f44336';
      return '#FF9800';
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cập nhật trạng thái lịch hẹn</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: ${getStatusColor(data.status)};
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            padding: 20px;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 5px 5px;
          }
          .appointment-details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
          .status-badge {
            display: inline-block;
            background-color: ${getStatusColor(data.status)};
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 0;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CẬP NHẬT TRẠNG THÁI LỊCH HẸN</h1>
        </div>
        
        <div class="content">
          <p>Xin chào <strong>${data.userName}</strong>,</p>
          
          <p>Trạng thái lịch hẹn của bạn tại <strong>${data.clinicName}</strong> đã được cập nhật:</p>
          
          <div style="text-align: center;">
            <div class="status-badge">${data.status}</div>
          </div>
          
          <div class="appointment-details">
            <h3>THÔNG TIN LỊCH HẸN</h3>
            <p><strong>Mã lịch hẹn:</strong> ${data.appointmentId}</p>
            <p><strong>Ngày hẹn:</strong> ${data.appointmentDate}</p>
            <p><strong>Ca khám:</strong> ${data.appointmentTime}</p>
            
            <h4>Địa điểm:</h4>
            <p>${data.clinicName}</p>
            <p>
              ${data.clinicAddress.description}, ${data.clinicAddress.ward}, ${data.clinicAddress.district}, ${data.clinicAddress.city}
            </p>
            
            <h4>Dịch vụ:</h4>
            <ul>
              ${servicesList}
            </ul>
          </div>

          <p>Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
          
          <p>Trân trọng,<br>Đội ngũ Pettopia</p>
          
          <div class="footer">
            <p>Đây là email tự động, vui lòng không trả lời email này.</p>
            <p>© ${new Date().getFullYear()} Pettopia. Tất cả các quyền được bảo lưu.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getAppointmentCancellationTemplate(data: {
    userName: string;
    appointmentDate: string;
    appointmentTime: string;
    clinicName: string;
    clinicAddress: {
      description: string;
      ward: string;
      district: string;
      city: string;
    };
    services: string[];
    appointmentId: string;
    cancelReason: string;
  }): string {
    const servicesList = data.services
      .map((service) => `<li>${service}</li>`)
      .join('');

    const cancelReasonHtml =
      data.cancelReason
        ? `<div style="background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 15px 0; border-radius: 3px;"><h4>LÝ DO HỦY:</h4><p>${data.cancelReason}</p></div>`
        : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Thông báo hủy lịch hẹn</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #f44336;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            padding: 20px;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 5px 5px;
          }
          .appointment-details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ LỊCH HẸN ĐÃ BỊ HỦY</h1>
        </div>
        
        <div class="content">
          <p>Xin chào <strong>${data.userName}</strong>,</p>
          
          <p>Lịch hẹn của bạn tại <strong>${data.clinicName}</strong> đã bị hủy.</p>
          
          <div class="appointment-details">
            <h3>THÔNG TIN LỊCH HẸN ĐÃ HỦY</h3>
            <p><strong>Mã lịch hẹn:</strong> ${data.appointmentId}</p>
            <p><strong>Ngày hẹn:</strong> ${data.appointmentDate}</p>
            <p><strong>Ca khám:</strong> ${data.appointmentTime}</p>
            
            <h4>Địa điểm:</h4>
            <p>${data.clinicName}</p>
            <p>
              ${data.clinicAddress.description}, ${data.clinicAddress.ward}, ${data.clinicAddress.district}, ${data.clinicAddress.city}
            </p>
            
            <h4>Dịch vụ:</h4>
            <ul>
              ${servicesList}
            </ul>
          </div>

          ${cancelReasonHtml}

          <p>Nếu bạn muốn đặt lịch hẹn khác hoặc có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
          
          <p>Trân trọng,<br>Đội ngũ Pettopia</p>
          
          <div class="footer">
            <p>Đây là email tự động, vui lòng không trả lời email này.</p>
            <p>© ${new Date().getFullYear()} Pettopia. Tất cả các quyền được bảo lưu.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
