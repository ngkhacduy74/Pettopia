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
<<<<<<< HEAD
=======
  Query,
  UseGuards,
>>>>>>> origin/test
} from '@nestjs/common';
import { AppService } from '../app.service';
import { lastValueFrom } from 'rxjs';
<<<<<<< HEAD
import { ClientProxy } from '@nestjs/microservices';
=======
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { UserToken } from 'src/decorators/user.decorator';
import { JwtAuthGuard } from 'src/guard/jwtAuth.guard';
import { RoleGuard } from 'src/guard/role.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
>>>>>>> origin/test

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authservice: ClientProxy,
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
    return lastValueFrom(this.authservice.send({ cmd: 'login' }, data));
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() data: any) {
    return lastValueFrom(this.authservice.send({ cmd: 'register' }, data));
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
}
