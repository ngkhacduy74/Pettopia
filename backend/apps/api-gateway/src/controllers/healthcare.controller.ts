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
  @HttpCode(HttpStatus.CREATED)
  async createAppointment(@Body() data: any, @UserToken('id') userId: string) {
    try {
      console.log('1928ujkasd');
      return await lastValueFrom(
        this.healthcareService.send(
          { cmd: 'createAppointment' },
          {
            data,
            user_id: userId,
          },
        ),
      );
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Đã xảy ra lỗi khi tạo lịch hẹn',
      });
    }
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
  @Roles(Role.STAFF, Role.ADMIN)
  @Patch('/appointments/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateAppointmentStatus(
    @Param('id') appointmentId: string,
    @UserToken('id') updatedByUserId: string,
    @Body() updateData: { status: string; cancel_reason?: string },
  ) {
    try {
      return await lastValueFrom(
        this.healthcareService.send(
          { cmd: 'updateAppointmentStatus' },
          {
            appointmentId,
            updateData,
            updatedByUserId,
          },
        ),
      );
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Đã xảy ra lỗi khi cập nhật trạng thái lịch hẹn',
      });
    }
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.STAFF, Role.CLINIC)
  @Patch('/appointments/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelAppointment(
    @Param('id') appointmentId: string,
    @UserToken('id') cancelledByUserId: string,
    @UserToken('role') role: Role,
    @UserToken('clinic_id') clinicId: string,
    @Body() cancelData: { cancel_reason?: string } = {},
  ) {
    try {
      return await lastValueFrom(
        this.healthcareService.send(
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
        ),
      );
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Đã xảy ra lỗi khi hủy lịch hẹn',
      });
    }
  }
}
