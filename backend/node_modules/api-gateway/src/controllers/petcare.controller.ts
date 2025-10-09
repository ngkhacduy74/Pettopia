import {
  Body,
  Controller,
  DefaultValuePipe,
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
import { AppService } from '../app.service';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwtAuth.guard';
import { RoleGuard } from 'src/guard/role.guard';

@Controller('api/v1/pet')
export class PetController {
  constructor(
    @Inject('PETCARE_SERVICE') private readonly petService: ClientProxy,
  ) {}
  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  async createPet(@Body() data: any) {
    console.log('dataPet', data);
    return await lastValueFrom(
      this.petService.send({ cmd: 'createPet' }, data),
    );
  }
   @Get('/all')
  async getAllPets() {
    return await lastValueFrom(
      this.petService.send({ cmd: 'getAllPets' }, {}),
    );
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
