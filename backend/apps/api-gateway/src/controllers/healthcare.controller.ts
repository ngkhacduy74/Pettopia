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
  async createAppointment(
    @Body() data: any, 
    @UserToken('id') userId: string
  ) {
    try {
      console.log("1928ujkasd");
      return await lastValueFrom(
        this.healthcareService.send(
          { cmd: 'createAppointment' },
          { 
              data,
              user_id: userId
            
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

  @UseGuards(JwtAuthGuard)
  @Get('/appointments')
  @HttpCode(HttpStatus.OK)
  async getUserAppointments(
    @UserToken('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    if (!userId) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Thiếu thông tin người dùng',
      });
    }

    return await lastValueFrom(
      this.healthcareService.send(
        { cmd: 'getUserAppointments' },
        { userId, page: Number(page), limit: Number(limit) },
      ),
    );
  }
}
