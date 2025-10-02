import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
} from '@nestjs/common';
import { AppService } from '../app.service';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

@Controller('api/v1/customer')
export class AppController {
  constructor(
    @Inject('CUSTOMER_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param('id') id: string) {
    const user = await lastValueFrom(
      this.userClient.send({ cmd: 'getUserById' }, { id }),
    );
    return user;
  }
}
