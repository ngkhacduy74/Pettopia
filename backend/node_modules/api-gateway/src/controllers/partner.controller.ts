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

@Controller('api/v1/partner')
export class PartnerController {
  constructor(
    @Inject('PARTNER_SERVICE') private readonly partnerService: ClientProxy,
  ) {}
  @UseGuards(JwtAuthGuard)
  @Post('/clinic/register')
  @HttpCode(HttpStatus.CREATED)
  async clinicRegister(@Body() data: any, @UserToken('id') userId: any) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'registerClinic' }, { ...data, userId }),
    );
  }
}
