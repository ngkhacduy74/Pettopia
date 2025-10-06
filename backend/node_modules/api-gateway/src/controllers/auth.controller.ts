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
} from '@nestjs/common';
import { AppService } from '../app.service';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

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
}
