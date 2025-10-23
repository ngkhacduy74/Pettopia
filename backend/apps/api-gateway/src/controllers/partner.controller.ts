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
import { VerifiedGuard } from 'src/guard/verified.guard';

@Controller('api/v1/partner')
export class PartnerController {
  constructor(
    @Inject('PARTNER_SERVICE') private readonly partnerService: ClientProxy,
  ) {}
  // @UseGuards(JwtAuthGuard)
  // @Post('/clinic/register')
  // @HttpCode(HttpStatus.CREATED)
  // async clinicRegister(@Body() data: any, @UserToken('id') user_id: any) {
  //   return await lastValueFrom(
  //     this.partnerService.send({ cmd: 'registerClinic' }, { ...data, user_id }),
  //   );
  // }

  @UseGuards(JwtAuthGuard)
  @Get('/clinic/form')
  @HttpCode(HttpStatus.OK)
  async getAllClinicForm(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ): Promise<any> {
    return await lastValueFrom(
      this.partnerService.send(
        { cmd: 'getAllClinicForm' },
        { page, limit, status },
      ),
    );
  }
  @UseGuards(JwtAuthGuard)
  @Post('/clinic/register')
  @HttpCode(HttpStatus.CREATED)
  async clinicRegister(@Body() data: any) {
    const user_id = '1628ed97-590d-4184-847f-94af4264f8d8';
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'registerClinic' }, { ...data, user_id }),
    );
  }

  @Get('/clinic/form/:id')
  @HttpCode(HttpStatus.OK)
  async getClinicFormById(@Param('id') idForm: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getClinicFormById' }, { id: idForm }),
    );
  }
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Post('/clinic/status/:id')
  @HttpCode(HttpStatus.OK)
  async updateStatusClinicForm(
    @Param('id') idForm: string,
    @Body() body: any,
    @UserToken('id') review_by: string,
  ) {
    console.log('iuqejaksdjk', review_by);
    // const review_by = 'c2a92f15-1578-46a2-a782-8c6d1e3acaeb';
    const payload = { id: idForm, ...body, review_by };
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'updateStatusClinicForm' }, payload),
    );
  }
  @Patch('/vet/status/form/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async updateVetFormStatus(
    @Param('id') id: string,
    @Body() data: any,
    @UserToken('id') review_by: string,
  ) {
    const { status, note } = data;
    return await lastValueFrom(
      this.partnerService.send(
        { cmd: 'updateVetFormStatus' },
        { status, note, review_by, id },
      ),
    );
  }
  @Get('/clinic')
  @HttpCode(HttpStatus.OK)
  async findAllClinic(
    @Query('page', new ParseIntPipe({ optional: true }))
    page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit: number = 10,
  ): Promise<any> {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'findAllClinic' }, { page, limit }),
    );
  }

  @Patch('/clinic/:id')
  @HttpCode(HttpStatus.OK)
  async updateClinicInfo(
    @Param('id') idClinic: string,
    @Body() updateData: any,
  ) {
    const payload = { id: idClinic, ...updateData };
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'updateClinicInfo' }, payload),
    );
  }

  @Patch('/clinic/active/:id')
  @HttpCode(HttpStatus.OK)
  async updateClinicActiveStatus(
    @Param('id') idClinic: string,
    @Body('is_active') is_active: boolean,
  ) {
    const payload = { id: idClinic, is_active };
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'updateClinicActiveStatus' }, payload),
    );
  }
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER)
  @Post('/vet/register')
  @HttpCode(HttpStatus.OK)
  async vetRegister(@Body() data: any, @UserToken('id') user_id: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'registerVet' }, { ...data, user_id }),
    );
  }
  @Get('/vet/form')
  @HttpCode(HttpStatus.OK)
  async getAllVetForm(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('status') status?: string,
  ): Promise<any> {
    return await lastValueFrom(
      this.partnerService.send(
        { cmd: 'getAllVetForm' },
        { page, limit, status },
      ),
    );
  }
  @Get('/vet/form/:id')
  @HttpCode(HttpStatus.OK)
  async getVetFormById(@Param('id') id: string): Promise<any> {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getVetFormById' }, { id }),
    );
  }
  @UseGuards(JwtAuthGuard)
  @Post('/service')
  @HttpCode(HttpStatus.CREATED)
  async createService(@Body() data: any) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'createService' }, data),
    );
  }
  @Get('/service')
  @HttpCode(HttpStatus.OK)
  async getAllService(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getAllService' }, { page, limit }),
    );
  }
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: any,
    @UserToken() clinic_id: any,
  ) {
    return this.partnerService.send(
      { cmd: 'update_service' },
      { serviceId: id, updateServiceDto, clinic_id },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @UserToken() clinic_id: any) {
    return this.partnerService.send(
      { cmd: 'remove_service' },
      { serviceId: id, clinic_id },
    );
  }

  @Patch('/service/status/:id')
  @HttpCode(HttpStatus.OK)
  async updateServiceStatus(
    @Param('id') idService: string,
    @Body('is_active') is_active: boolean,
  ) {
    return await lastValueFrom(
      this.partnerService.send(
        { cmd: 'updateServiceStatus' },
        { id: idService, is_active },
      ),
    );
  }
}
