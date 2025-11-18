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
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('/appointment')
  @HttpCode(HttpStatus.ACCEPTED)
  async createAppointment(@Body() data: any, @UserToken('id') userId: string) {
    this.healthcareService.emit(
      { cmd: 'createAppointment' },
      {
        data,
        user_id: userId,
      },
    );
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Yêu cầu tạo lịch hẹn đang được xử lý.',
    };
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
}