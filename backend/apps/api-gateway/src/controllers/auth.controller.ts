import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
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
  async test() {
    return await lastValueFrom(this.customerService.send({ cmd: 'test' }, {}));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() data: any) {
    return await lastValueFrom(this.authService.send({ cmd: 'login' }, data));
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() data: any) {
    return await lastValueFrom(
      this.authService.send({ cmd: 'register' }, data),
    );
  }

  @Post('invite-vet')
  @HttpCode(HttpStatus.OK)
  async inviteVet(
    @Body('email') email: string,
    // @UserToken('clinic_id') clinic_id: string,
  ) {
    const clinic_id = '5e6e1a38-3bd9-46bf-a3b5-60767d15a28f';
    return await lastValueFrom(
      this.authService.send({ cmd: 'invite_vet' }, { email, clinic_id }),
    );
  }

  @Get('accept-invite')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(@Query('token') token: string) {
    return await lastValueFrom(
      this.authService.send({ cmd: 'accept_invite' }, { token }),
    );
  }

  @Post('send-otp-email')
  @HttpCode(HttpStatus.OK)
  async sendOtpEmail(@Body('email') email: string) {
    return await lastValueFrom(
      this.authService.send({ cmd: 'send-otp-email' }, { email }),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Post('send-clinic-verification')
  @HttpCode(HttpStatus.OK)
  async sendClinicVerification(@Body('clinic_id_form') clinic_id: string) {
    return await lastValueFrom(
      this.authService.send(
        { cmd: 'sendClinicVerificationMail' },
        { clinic_id },
      ),
    );
  }
}
