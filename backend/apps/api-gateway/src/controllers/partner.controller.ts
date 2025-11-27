import {
  BadRequestException,
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
  @Post('/clinic/register')
  @HttpCode(HttpStatus.ACCEPTED)
  async clinicRegister(@Body() data: any, @UserToken('id') user_id: string) {
    this.partnerService.emit({ cmd: 'registerClinic' }, { ...data, user_id });
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu đăng ký phòng khám đang được xử lý.',
    };
  }
  
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
  
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Get('/service/all/admin')
  @HttpCode(HttpStatus.OK)
  async getAllServicesForAdmin(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getAllService' }, { page, limit }),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Patch('/service/:id/deactivate')
  @HttpCode(HttpStatus.ACCEPTED)
  async deactivateService(@Param('id') id: string) {
    if (!id) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Thiếu mã dịch vụ',
      });
    }

    this.partnerService.emit(
      { cmd: 'updateServiceStatus' },
      { id, is_active: false },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu cập nhật trạng thái dịch vụ đang được xử lý.',
    };
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

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Post('/clinic/invitations')
  @HttpCode(HttpStatus.ACCEPTED)
  async inviteClinicMember(
    @Body('email') invited_email: string,
    @Body('role') role: string,
    @UserToken('clinic_id') clinic_id: string,
    @UserToken('id') invited_by: string,
  ) {
    if (!clinic_id) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Không xác định được phòng khám.',
      });
    }
    if (!invited_email) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Email lời mời là bắt buộc.',
      });
    }

    if (!role) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Vai trò lời mời là bắt buộc.',
      });
    }
    this.partnerService.emit(
      { cmd: 'createClinicMemberInvitation' },
      {
        clinic_id,
        invited_email,
        role,
        invited_by,
      },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu gửi lời mời thành viên đang được xử lý.',
    };
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.VET)
  @Post('/clinic/invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  async acceptClinicInvitation(
    @Param('token') token: string,
    @UserToken('id') vet_id: string,
  ) {
    return await lastValueFrom(
      this.partnerService.send(
        { cmd: 'acceptClinicMemberInvitation' },
        { token, vet_id },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.VET)
  @Post('/clinic/invitations/:token/decline')
  @HttpCode(HttpStatus.ACCEPTED)
  async declineClinicInvitation(@Param('token') token: string) {
    this.partnerService.emit(
      { cmd: 'declineClinicMemberInvitation' },
      { token },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu từ chối lời mời đang được xử lý.',
    };
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
  @HttpCode(HttpStatus.ACCEPTED)
  async updateStatusClinicForm(
    @Param('id') idForm: string,
    @Body() body: any,
    @UserToken('id') review_by: string,
  ) {
    const payload = { id: idForm, ...body, review_by };
    this.partnerService.emit({ cmd: 'updateStatusClinicForm' }, payload);
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu cập nhật trạng thái form đang được xử lý.',
    };
  }

  @Patch('/vet/status/form/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async updateVetFormStatus(
    @Param('id') id: string,
    @Body() data: any,
    @UserToken('id') review_by: string,
  ) {
    const { status, note } = data;
    this.partnerService.emit(
      { cmd: 'updateVetFormStatus' },
      { status, note, review_by, id },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu cập nhật trạng thái form Vet đang được xử lý.',
    };
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
  @HttpCode(HttpStatus.ACCEPTED)
  async updateClinicInfo(
    @Param('id') idClinic: string,
    @Body() updateData: any,
  ) {
    const payload = { id: idClinic, ...updateData };
    this.partnerService.emit({ cmd: 'updateClinicInfo' }, payload);
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu cập nhật thông tin phòng khám đang được xử lý.',
    };
  }

  @Get('/vet/form/:id')
  @HttpCode(HttpStatus.OK)
  async getVetFormById(@Param('id') id: string): Promise<any> {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getVetFormById' }, { id }),
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

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Post('/service')
  @HttpCode(HttpStatus.ACCEPTED)
  async createService(@Body() data: any, @UserToken('id') clinic_id: string) {
    this.partnerService.emit({ cmd: 'createService' }, { data, clinic_id });
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu tạo dịch vụ đang được xử lý.',
    };
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
    this.partnerService.emit(
      { cmd: 'update_service' },
      { serviceId: id, updateServiceDto, clinic_id },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu cập nhật dịch vụ đang được xử lý.',
    };
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Delete(':id')
  remove(@Param('id') id: string, @UserToken() clinic_id: any) {
    this.partnerService.emit(
      { cmd: 'remove_service' },
      { serviceId: id, clinic_id },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu xóa dịch vụ đang được xử lý.',
    };
  }
  
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Patch('/service/status/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  async updateServiceStatus(
    @Param('id') idService: string,
    @Body('is_active') is_active: boolean,
  ) {
    this.partnerService.emit(
      { cmd: 'updateServiceStatus' },
      { id: idService, is_active },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu cập nhật trạng thái dịch vụ đang được xử lý.',
    };
  }
  
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Post('/clinic/shift')
  @HttpCode(HttpStatus.ACCEPTED)
  async createClinicShift(@Body() data: any, @UserToken('id') clinic_id: any) {
    this.partnerService.emit(
      { cmd: 'createClinicShift' },
      { ...data, clinic_id },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu tạo ca làm việc đang được xử lý.',
    };
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Put('/clinic/shift/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  async updateClinicShift(
    @Param('id') idShift: string,
    @Body() updateData: any,
  ) {
    const payload = { id: idShift, ...updateData };
    this.partnerService.emit({ cmd: 'updateClinicShift' }, payload);
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu cập nhật ca làm việc đang được xử lý.',
    };
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Delete('/clinic/shift/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  async deleteClinicShift(
    @Param('id') idShift: string,
    @UserToken('clinic_id') clinic_id: string,
  ) {
    if (!idShift || !clinic_id) {
      throw new BadRequestException('Thiếu thông tin bắt buộc');
    }
    this.partnerService.emit(
      { cmd: 'deleteClinicShift' },
      { id: idShift, clinic_id },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu xóa ca làm việc đang được xử lý.',
    };
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Patch('/clinic/shift/:id/status')
  @HttpCode(HttpStatus.ACCEPTED)
  async updateClinicShiftStatus(
    @Param('id') idShift: string,
    @Body('is_active') is_active: boolean,
  ) {
    const payload = { id: idShift, is_active };
    this.partnerService.emit({ cmd: 'updateClinicShiftStatus' }, payload);
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu cập nhật trạng thái ca làm việc đang được xử lý.',
    };
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('/clinic/shift/:clinic_id')
  @HttpCode(HttpStatus.OK)
  async getShiftsByClinicId(@Param('clinic_id') clinic_id: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getShiftsByClinicId' }, { clinic_id }),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER)
  @Get('/service/:clinic_id')
  @HttpCode(HttpStatus.OK)
  async getServicesByClinicId(@Param('clinic_id') clinic_id: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getServicesByClinicId' }, { clinic_id }),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF, Role.CLINIC)
  @Get('/service/:id')
  @HttpCode(HttpStatus.OK)
  async getServiceById(@Param('id') id: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getServiceById' }, { id }),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Delete('/service/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  async deleteService(
    @Param('id') serviceId: string,
    @UserToken('clinic_id') clinic_id: string,
  ) {
    this.partnerService.emit(
      { cmd: 'remove_service' },
      { serviceId, clinic_id },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu xóa dịch vụ đang được xử lý.',
    };
  }

  @UseGuards(ClinicUpdateGuard)
  @Put('/verify-clinic/update-form/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  async updateClinicForm(@Param('id') id: string, @Body() dto: any) {
    if (!id) {
      throw new RpcException('Thiếu ID phòng khám trong URL');
    }
    const payload = { id, dto };
    this.partnerService.emit({ cmd: 'updateClinicForm' }, payload);
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu cập nhật form đang được xử lý.',
    };
  }


  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC)
  @Get('/clinic/members/:clinic_id')
  @HttpCode(HttpStatus.OK)
  async getClinicMembers(@Param('clinic_id') clinic_id: string) {
    return await lastValueFrom(
      this.partnerService.send({ cmd: 'getClinicMembers' }, { clinic_id }),
    );
  }
}

