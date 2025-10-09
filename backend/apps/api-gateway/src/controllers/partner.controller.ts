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

@Controller('api/v1/partner')
export class PartnerController {
  constructor(
    @Inject('PARTNER_SERVICE') private readonly partnerService: ClientProxy,
  ) {}
  @UseGuards(JwtAuthGuard)
  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  async createPet(@Body() data: any) {
    console.log('dataPet', data);
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'createPet' }, data),
    );
  }
}
