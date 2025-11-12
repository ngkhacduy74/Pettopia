import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { OtpService } from 'src/services/otp.service';
import { SendEmailOtpDto } from 'src/dtos/send-mail.dto';
import { handleRpcError } from 'src/common/error.detail';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';  
import { ResetPasswordDto } from '../dtos/reset-password.dto';  
import { ChangePasswordDto } from '../dtos/change-password.dto';
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @MessagePattern({ cmd: 'login' })
  login(data: LoginDto) {
    return this.authService.login(data);
  }
  @MessagePattern({ cmd: 'register' })
  register(data: RegisterDto) {
    return this.authService.register(data);
  }
  @MessagePattern({ cmd: 'send-otp-email' })
  async sendOtpMail(@Payload() data: SendEmailOtpDto) {
    const email = data.email;
    const result = await this.otpService.sendEmailOtp(email);
    return result;
  }
  @MessagePattern({ cmd: 'verifyClinicToken' })
  async verifyClinicToken(@Payload() data: any) {
    try {
      return await this.authService.verifyClinicToken(data.token);
    } catch (err) {
      handleRpcError('ClinicController.verifyClinicToken', err);
    }
  }
  @MessagePattern({ cmd: 'convert-location' })
  async convertLocation(@Payload() address: string) {
    try {
      return await this.authService.convertAddressToLocation(address);
    } catch (err) {
      handleRpcError('ClinicController.convertLocation', err);
    }
  }
  @MessagePattern({ cmd: 'forgot-password' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async forgotPassword(@Payload() data: ForgotPasswordDto) {
    return this.authService.forgotPassword(data);
  }

  @MessagePattern({ cmd: 'reset-password' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resetPassword(@Payload() data: ResetPasswordDto) {
    return this.authService.resetPassword(data);
  }

  @MessagePattern({ cmd: 'change-password' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async changePassword(@Payload() data: ChangePasswordDto & { userId: string }) {
    return this.authService.changePassword(data);
  }
}
