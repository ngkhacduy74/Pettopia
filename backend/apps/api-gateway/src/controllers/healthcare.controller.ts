import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwtAuth.guard';
import { RoleGuard } from 'src/guard/role.guard';
import { UserToken } from 'src/decorators/user.decorator';

@Controller('api/v1/healthcare')
export class HealthcareController {
  constructor(
    @Inject('HEALTHCARE_SERVICE')
    private readonly healthcareService: ClientProxy,
  ) {}
  @UseGuards(JwtAuthGuard)
  @Post('/appointment')
  @HttpCode(HttpStatus.OK)
  async createAppointment(@Body() data: any, @UserToken('id') user_id: string) {
    console.log('data appointment gateway', data, user_id);
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'createAppointment' },
        { data, user_id },
      ),
    );
  }
}
