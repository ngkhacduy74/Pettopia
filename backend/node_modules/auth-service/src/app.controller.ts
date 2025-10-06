import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern({ cmd: 'login' })
  login(data: LoginDto) {
    console.log('kjakahsd', data);
    return this.appService.login(data);
  }
  @MessagePattern({ cmd: 'register' })
  register(data: RegisterDto) {
    return this.appService.register(data);
  }
}
