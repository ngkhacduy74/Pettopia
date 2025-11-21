import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { UserToken } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from 'src/guard/jwtAuth.guard';
import { RoleGuard } from 'src/guard/role.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
    @Inject('CUSTOMER_SERVICE') private readonly customerService: ClientProxy,
  ) {}

  @Get('/test')
  @HttpCode(HttpStatus.OK)
  async test(@Param('id') id: string) {
    return lastValueFrom(this.customerService.send({ cmd: 'test' }, {}));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() data: any) {
    console.log(data);
    return lastValueFrom(this.authService.send({ cmd: 'login' }, data));
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() data: any) {
    return lastValueFrom(this.authService.send({ cmd: 'register' }, data));
  }

  @Post('send-otp-email')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendOtpEmail(@Body('email') email: string) {
    this.authService.emit({ cmd: 'send-otp-email' }, { email });
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu gửi mã OTP đã được chấp nhận và đang xử lý.',
    };
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Post('send-clinic-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendClinicVerification(@Body('clinic_id_form') clinic_id: string) {
    this.authService.emit({ cmd: 'sendClinicVerificationMail' }, { clinic_id });
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu gửi email xác minh đã được chấp nhận và đang xử lý.',
    };
  }

  @Get('verify/clinic')
  async verifyClinic(@Query('token') token: string) {
    try {
      return await lastValueFrom(
        this.authService.send({ cmd: 'verifyClinicToken' }, { token }),
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Post('convert/location')
  async convertLocation(@Body() address: string) {
    try {
      return await lastValueFrom(
        this.authService.send({ cmd: 'convert-location' }, { address }),
      );
    } catch (err) {
      throw new RpcException(err);
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(@Body() data: any) {
    this.authService.emit({ cmd: 'forgot-password' }, data);
    return {
      statusCode: HttpStatus.ACCEPTED,
      message:
        'Yêu cầu đặt lại mật khẩu đã được chấp nhận. Vui lòng kiểm tra email.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() data: any) {
    return await lastValueFrom(
      this.authService.send({ cmd: 'reset-password' }, data),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() data: any, @UserToken('id') userId: string) {
    return await lastValueFrom(
      this.authService.send({ cmd: 'change-password' }, { ...data, userId }),
    );
  }
}
