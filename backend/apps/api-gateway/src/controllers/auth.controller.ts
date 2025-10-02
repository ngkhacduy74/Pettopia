import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { AppService } from '../app.service';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

@Controller('api/v1/auth')
export class AppController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authservice: ClientProxy,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() data: any) {
    const result = await lastValueFrom(
      this.authservice.send({ cmd: 'login' }, data),
    );
    return result;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() data: any) {
    const result = await lastValueFrom(
      this.authservice.send({ cmd: 'register' }, data),
    );
    return result;
  }
}
