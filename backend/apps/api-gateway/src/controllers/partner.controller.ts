import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwtAuth.guard';
import { RoleGuard } from 'src/guard/role.guard';
import { UserToken } from 'src/decorators/user.decorator';
import { VerifiedGuard } from 'src/guard/verified.guard';
import { ClinicUpdateGuard } from 'src/guard/clinic-update.guard';

@Controller('api/v1/partner')
export class PartnerController {
  constructor(
    @Inject('PARTNER_SERVICE') private readonly partnerService: ClientProxy,
  ) {}

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
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Get('/service/all')
  @HttpCode(HttpStatus.OK)
  async getAllServices(
    @UserToken('clinic_id') clinic_id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    console.log('ládlakjsd', clinic_id);
    return await lastValueFrom(
      this.partnerService.send(
        { cmd: 'getAllServicesFollowClinicId' },
        { clinic_id, page, limit },
      ),
    );
  }
  @UseGuards(JwtAuthGuard)
  @Post('/clinic/register')
  @HttpCode(HttpStatus.CREATED)
  async clinicRegister(@Body() data: any, @UserToken('id') user_id: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'registerClinic' }, { ...data, user_id }),
    );
  }
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Get('/clinic/shift')
  @HttpCode(HttpStatus.OK)
  async getClinicShifts(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @UserToken('id') clinic_id: any,
  ) {
    return await lastValueFrom(
      this.partnerService.send(
        { cmd: 'getClinicShifts' },
        { clinic_id, page, limit },
      ),
    );
  }
  @UseGuards(JwtAuthGuard)
  @Get('/clinic/:id')
  @HttpCode(HttpStatus.OK)
  async getClinicById(@Param('id') idClinic: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getClinicById' }, { id: idClinic }),
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

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Post('/service')
  @HttpCode(HttpStatus.CREATED)
  async createService(@Body() data: any, @UserToken('id') clinic_id: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'createService' }, { data, clinic_id }),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Get('/service')
  @HttpCode(HttpStatus.OK)
  async getMyServices(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @UserToken('id') clinic_id: string,
  ) {
    return await lastValueFrom(
      this.partnerService.send(
        { cmd: 'getServicesByClinicId' },
        { clinic_id, page, limit },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
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

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Delete(':id')
  remove(@Param('id') id: string, @UserToken() clinic_id: any) {
    return this.partnerService.send(
      { cmd: 'remove_service' },
      { serviceId: id, clinic_id },
    );
  }
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
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
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Post('/clinic/shift')
  @HttpCode(HttpStatus.CREATED)
  async createClinicShift(@Body() data: any, @UserToken('id') clinic_id: any) {
    return await lastValueFrom(
      this.partnerService.send(
        { cmd: 'createClinicShift' },
        { ...data, clinic_id },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Put('/clinic/shift/:id')
  @HttpCode(HttpStatus.OK)
  async updateClinicShift(
    @Param('id') idShift: string,
    @Body() updateData: any,
  ) {
    const payload = { id: idShift, ...updateData };
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'updateClinicShift' }, payload),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Delete('/clinic/shift/:id')
  @HttpCode(HttpStatus.OK)
  async deleteClinicShift(@Param('id') idShift: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'deleteClinicShift' }, { id: idShift }),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Patch('/clinic/shift/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateClinicShiftStatus(
    @Param('id') idShift: string,
    @Body('is_active') is_active: boolean,
  ) {
    const payload = { id: idShift, is_active };
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'updateClinicShiftStatus' }, payload),
    );
  }
  @UseGuards(JwtAuthGuard)
  @Get('/clinic/shift/:clinic_id')
  @HttpCode(HttpStatus.OK)
  async getShiftsByClinicId(@Param('clinic_id') clinic_id: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getShiftsByClinicId' }, { clinic_id }),
    );
  }

  @Get('/service/:clinic_id')
  @HttpCode(HttpStatus.OK)
  async getServicesByClinicId(@Param('clinic_id') clinic_id: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getServicesByClinicId' }, { clinic_id }),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Get('/service/:id')
  @HttpCode(HttpStatus.OK)
  async getServiceById(@Param('id') id: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getServiceById' }, { id }),
    );
  }

  @UseGuards(ClinicUpdateGuard)
  @Put('/verify-clinic/update-form/:id')
  @HttpCode(HttpStatus.OK)
  async updateClinicForm(@Param('id') id: string, @Body() dto: any) {
    if (!id) {
      throw new RpcException('Thiếu ID phòng khám trong URL');
    }
    const payload = { id, dto };
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'updateClinicForm' }, payload),
    );
  }
}
