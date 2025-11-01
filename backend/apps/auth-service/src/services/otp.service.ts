import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import { OtpMethod } from 'src/schemas/otp.schema';
import { MailType } from 'src/schemas/mail.schema';
import { OtpRepository } from 'src/repositories/otp.repositories';
import { MailService } from './mail.service';
import { generateOtpCode } from 'src/common/generateOtp.common';

@Injectable()
export class OtpService {
  constructor(
    private readonly otpRepository: OtpRepository,
    private readonly mailService: MailService,
    // private readonly smsService: SmsService,
  ) {}
  async sendEmailOtp(email: string): Promise<{ message: string }> {
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
    await this.otpRepository.deleteExistingOtps(email, OtpMethod.EMAIL);
    await this.otpRepository.createOtp(email, code, OtpMethod.EMAIL, expiresAt);
    const subject = 'Mã Xác Thực Tài Khoản Pettopia (OTP)';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #444; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        
        <div style="background-color: #5599ff; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🐶🐱 Pettopia - Mã Xác Thực 🐱🐶</h1>
        </div>

        <div style="padding: 25px; text-align: center;">
          <p style="font-size: 16px;">
            Xin chào! Bạn vừa yêu cầu mã xác thực cho tài khoản Pettopia.
          </p>
          <p style="font-size: 16px; margin-bottom: 25px;">
            Vui lòng sử dụng mã dưới đây để hoàn tất quá trình xác minh:
          </p>

          <div style="margin: 25px 0; padding: 15px; background-color: #f0f8ff; border: 2px dashed #5599ff; border-radius: 8px;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 5px;">
              ${code}
            </p>
          </div>
          
          <p style="font-size: 14px; color: #888;">
            Mã này chỉ có hiệu lực trong vòng <strong style="color: #dc3545;">5 phút</strong> và phân biệt chữ hoa/chữ thường. Tuyệt đối không chia sẻ mã này!
          </p>
          
          <p style="font-size: 14px; margin-top: 30px;">
            Cảm ơn bạn đã tin tưởng Pettopia. Chúc bạn và thú cưng có một ngày tuyệt vời!
          </p>
        </div>

        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777;">
          © ${new Date().getFullYear()} Pettopia. All rights reserved.
        </div>
      </div>
    `;

    try {
      await this.mailService.sendMail(email, subject, html, MailType.REMIND);
    } catch (error) {
      console.error('Lỗi khi gửi email OTP:', error);
      throw new InternalServerErrorException(
        'Không thể gửi email xác thực. Vui lòng thử lại sau.',
      );
    }

    return { message: '✅ Đã gửi mã xác thực qua email thành công.' };
  }

  // ============== CHỨC NĂNG XÁC THỰC EMAIL OTP ==============
  async verifyEmailOtp(
    email: string,
    otpCode: string,
  ): Promise<{ success: true }> {
    // 1. Tìm mã OTP hợp lệ trong DB
    const otpRecord = await this.otpRepository.findAndVerifyOtp(
      email,
      otpCode,
      OtpMethod.EMAIL,
    );

    if (!otpRecord) {
      throw new BadRequestException(
        'Mã xác thực không hợp lệ hoặc đã hết hạn.',
      );
    }

    await this.otpRepository.deleteOtp(otpRecord.id);

    return { success: true };
  }
}
