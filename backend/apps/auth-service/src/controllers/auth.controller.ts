import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { MessagePattern } from '@nestjs/microservices';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { OtpService } from 'src/services/otp.service';

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
}
