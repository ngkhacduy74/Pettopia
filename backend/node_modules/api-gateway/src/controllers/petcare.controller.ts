import {
  Body,
  Controller,
  Delete,
  Get,
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
import { Get, Delete } from '@nestjs/common';

@Controller('api/v1/pet')
export class PetController {
  constructor(
    @Inject('PETCARE_SERVICE') private readonly petService: ClientProxy,
  ) {}
  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  async createPet(@Body() data: any) {
    return await lastValueFrom(
      this.petService.send({ cmd: 'createPet' }, data),
    );
  }
  @Get('/all')
  async getAllPets() {
    return await lastValueFrom(this.petService.send({ cmd: 'getAllPets' }, {}));
  }

  @Get('/count')
  async getPetCount() {
    return await lastValueFrom(
      this.petService.send({ cmd: 'getPetCount' }, {}),
    );
  }

  @Get('/:id')
  async getPetById(@Param('id') pet_id: string) {
    return await lastValueFrom(
      this.petService.send({ cmd: 'getPetById' }, { pet_id }),
    );
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  async deletePet(@Param('id') pet_id: string) {
    return await lastValueFrom(
      this.petService.send({ cmd: 'deletePet' }, { pet_id }),
    );
  }
}
