import {
  Body,
  Controller,
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
import { RpcException } from '@nestjs/microservices';

@Controller('api/v1/healthcare')
export class HealthcareController {
  constructor(
    @Inject('HEALTHCARE_SERVICE')
    private readonly healthcareService: ClientProxy,
    @Inject('PETCARE_SERVICE')
    private readonly petcareService: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('/appointment')
  @HttpCode(HttpStatus.ACCEPTED)
  async createAppointment(@Body() data: any, @UserToken('id') userId: string) {
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'createAppointment' },
        {
          data,
          user_id: userId,
        },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.STAFF, Role.CLINIC)
  @Get('/appointments')
  @HttpCode(HttpStatus.OK)
  async getAppointments(
    @UserToken('id') userId: string,
    @UserToken('role') role: Role,
    @UserToken('clinic_id') clinicId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'getAppointments' },
        {
          role,
          userId,
          clinicId,
          page: Number(page),
          limit: Number(limit),
        },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.STAFF, Role.CLINIC)
  @Get('/appointments/:id')
  @HttpCode(HttpStatus.OK)
  async getAppointmentById(
    @Param('id') appointmentId: string,
    @UserToken('id') userId: string,
    @UserToken('role') role: Role,
    @UserToken('clinic_id') clinicId: string,
  ) {
    try {
      return await lastValueFrom(
        this.healthcareService.send(
          { cmd: 'getAppointmentById' },
          {
            appointmentId,
            role,
            userId,
            clinicId,
          },
        ),
      );
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Đã xảy ra lỗi khi lấy thông tin lịch hẹn',
      });
    }
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.STAFF, Role.ADMIN, Role.CLINIC)
  @Patch('/appointments/:id/status')
  @HttpCode(HttpStatus.ACCEPTED)
  async updateAppointmentStatus(
    @Param('id') appointmentId: string,
    @UserToken('id') updatedByUserId: string,
    @Body() updateData: { status: string; cancel_reason?: string },
  ) {
    this.healthcareService.emit(
      { cmd: 'updateAppointmentStatus' },
      {
        appointmentId,
        updateData,
        updatedByUserId,
      },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu cập nhật trạng thái lịch hẹn đang được xử lý.',
    };
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.STAFF, Role.CLINIC)
  @Patch('/appointments/:id/cancel')
  @HttpCode(HttpStatus.ACCEPTED)
  async cancelAppointment(
    @Param('id') appointmentId: string,
    @UserToken('id') cancelledByUserId: string,
    @UserToken('role') role: Role,
    @UserToken('clinic_id') clinicId: string,
    @Body() cancelData: { cancel_reason?: string } = {},
  ) {
    this.healthcareService.emit(
      { cmd: 'cancelAppointment' },
      {
        appointmentId,
        cancelledByUserId,
        role,
        clinicId,
        cancelData: {
          cancel_reason: cancelData?.cancel_reason,
        },
      },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu hủy lịch hẹn đang được xử lý.',
    };
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC, Role.STAFF, Role.ADMIN)
  @Post('/appointment/for-customer')
  @HttpCode(HttpStatus.ACCEPTED)
  async createAppointmentForCustomer(
    @Body() data: any,
    @UserToken('id') partnerId: string,
  ) {
    this.healthcareService.emit(
      { cmd: 'createAppointmentForCustomer' },
      {
        data,
        partner_id: partnerId,
      },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu tạo lịch hẹn hộ khách hàng đang được xử lý.',
    };
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC, Role.STAFF, Role.ADMIN)
  @Post('/pets')
  @HttpCode(HttpStatus.CREATED)
  async createPetForCustomer(
    @Body() data: any,
    @UserToken('id') staffId: string,
  ) {
    const ownerId = data.customer_id || data.owner_id;

    const payload = {
      ...data,
      owner_id: ownerId,
      created_by: staffId,
    };

    return await lastValueFrom(
      this.petcareService.send({ cmd: 'createPet' }, payload),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC, Role.STAFF, Role.ADMIN)
  @Get('/appointments/today')
  @HttpCode(HttpStatus.OK)
  async getTodayAppointmentsForClinic(
    @UserToken('clinic_id') clinicId: string,
    @Query('date') date?: string,
    @Query('statuses') statuses?: string | string[],
  ) {
    if (!clinicId) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Thiếu thông tin phòng khám',
      });
    }

    const parsedStatuses = Array.isArray(statuses)
      ? statuses
      : statuses
        ? statuses.split(',').map((s) => s.trim())
        : undefined;

    const payload: any = {
      clinicId,
    };

    if (date) {
      payload.date = date;
    }

    if (parsedStatuses && parsedStatuses.length > 0) {
      payload.statuses = parsedStatuses;
    }

    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'getTodayAppointmentsForClinic' },
        payload,
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.VET)
  @Get('/appointments/my')
  @HttpCode(HttpStatus.OK)
  async getMyAppointments(@UserToken('id') vetId: string) {
    return await lastValueFrom(
      this.healthcareService.send({ cmd: 'getMyAppointments' }, { vetId }),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.VET, Role.CLINIC, Role.STAFF)
  @Post('/appointments/:id/assign-vet')
  @HttpCode(HttpStatus.OK)
  async assignVetAndStart(
    @Param('id') appointmentId: string,
    @UserToken('id') userId: string,
    @Body() body: { vetId?: string },
  ) {
    const vetIdToAssign = body.vetId || userId;
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'assignVetAndStart' },
        {
          appointmentId,
          vetId: vetIdToAssign,
        },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC, Role.STAFF, Role.ADMIN)
  @Post('/appointments/:id/assign-pet')
  @HttpCode(HttpStatus.OK)
  async assignPetToAppointment(
    @Param('id') appointmentId: string,
    @Body() body: any,
    @UserToken('clinic_id') clinicId: string,
  ) {
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'assignPetToAppointment' },
        {
          appointmentId,
          petId: body.pet_id,
          clinicId,
        },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.CLINIC, Role.STAFF, Role.VET)
  @Post('/appointments/:id/check-in')
  @HttpCode(HttpStatus.OK)
  async checkInAppointment(@Param('id') appointmentId: string) {
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'checkInAppointment' },
        { appointmentId },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.VET, Role.CLINIC)
  @Post('/appointments/:id/medical-records')
  @HttpCode(HttpStatus.OK)
  async createMedicalRecordWithMedications(
    @Param('id') appointmentId: string,
    @Body() medicalRecordData: any,
  ) {
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'createMedicalRecordWithMedications' },
        {
          appointmentId,
          medicalRecordData,
        },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.VET, Role.CLINIC, Role.STAFF, Role.ADMIN)
  @Post('/appointments/:id/complete')
  @HttpCode(HttpStatus.OK)
  async completeAppointment(@Param('id') appointmentId: string) {
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'completeAppointment' },
        { appointmentId },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.VET)
  @Get('/appointments/vet/me')
  @HttpCode(HttpStatus.OK)
  async getAssignedAppointments(
    @UserToken('id') vetId: string,
    @Query('status') status?: string,
  ) {
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'getAssignedAppointments' },
        { vetId, status },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.VET, Role.CLINIC, Role.STAFF, Role.ADMIN)
  @Get('/pets/:id/medical-records')
  @HttpCode(HttpStatus.OK)
  async getMedicalRecordsByPet(
    @Param('id') petId: string,
    @UserToken('role') role: Role,
    @UserToken('clinic_id') clinicId: string,
    @UserToken('id') userId: string,
  ) {
    const result: any = await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'getMedicalRecordsByPet' },
        { petId, role, clinicId, vetId: userId },
      ),
    );

    if (!result || !Array.isArray(result.data)) {
      return result;
    }

    // Nếu là Clinic hoặc Staff: chỉ được xem hồ sơ thuộc clinic của mình
    if (
      (role === Role.CLINIC || role === Role.STAFF) &&
      clinicId
    ) {
      result.data = result.data.filter((item: any) => {
        const recordClinicId = item?.medicalRecord?.clinic_id;
        return recordClinicId === clinicId;
      });
    }

    // Mọi role không phải Admin (bao gồm Vet) đều bị ẩn clinic_id và vet_id
    if (role !== Role.ADMIN) {
      result.data = result.data.map((item: any) => {
        if (item && item.medicalRecord) {
          const { clinic_id, vet_id, ...restRecord } = item.medicalRecord;
          return {
            ...item,
            medicalRecord: restRecord,
          };
        }
        return item;
      });
    }

    return result;
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.VET, Role.CLINIC, Role.STAFF, Role.ADMIN)
  @Get('/appointments/:id/medical-record')
  @HttpCode(HttpStatus.OK)
  async getMedicalRecordByAppointment(
    @Param('id') appointmentId: string,
    @UserToken('id') userId: string,
    @UserToken('role') role: Role,
  ) {
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'getMedicalRecordByAppointment' },
        { appointmentId, userId, role },
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.VET)
  @Patch('/appointments/:id/medical-record')
  @HttpCode(HttpStatus.OK)
  async updateMedicalRecord(
    @Param('id') appointmentId: string,
    @UserToken('id') userId: string,
    @UserToken('role') role: Role,
    @Body() updateData: any,
  ) {
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'updateMedicalRecord' },
        { appointmentId, userId, role, updateData },
      ),
    );
  }

  // =========================================================
  // CLINIC RATING
  // =========================================================

  // Người dùng sau khi khám xong sẽ gửi đánh giá cho lịch hẹn
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER)
  @Post('/appointments/:id/rating')
  @HttpCode(HttpStatus.CREATED)
  async createAppointmentRating(
    @Param('id') appointmentId: string,
    @UserToken('id') userId: string,
    @Body() body: any,
  ) {
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'createAppointmentRating' },
        {
          appointmentId,
          userId,
          ratingData: body,
        },
      ),
    );
  }

  @Get('/clinics/:id/rating')
  @HttpCode(HttpStatus.OK)
  async getClinicRatingSummary(@Param('id') clinicId: string) {
    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'getClinicRatingSummary' },
        { clinicId },
      ),
    );
  }
}
