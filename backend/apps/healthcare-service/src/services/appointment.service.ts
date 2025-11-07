import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { CreateAppointmentDto } from 'src/dto/appointment.dto';
import { AppointmentRepository } from '../repositories/appointment.repositories';
import {
  AppointmentStatus,
  AppointmentShift,
} from 'src/schemas/appoinment.schema';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AppointmentService {
  constructor(
    @Inject('PARTNER_SERVICE')
    private readonly partnerService: ClientProxy,
    @Inject('CUSTOMER_SERVICE')
    private readonly customerService: ClientProxy,
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
    private readonly appointmentRepositories: AppointmentRepository,
  ) {}

  async createAppointment(
    data: CreateAppointmentDto,
    user_id: string,
  ): Promise<any> {
    const { clinic_id, service_ids, pet_ids, shift_id, date } = data;

    try {

      const [clinic, services, shift] = await Promise.all([
        lastValueFrom(
          this.partnerService.send({ cmd: 'getClinicById' }, { id: clinic_id }),
        ),
        lastValueFrom(
          this.partnerService.send(
            { cmd: 'validateClinicServices' },
            { clinic_id, service_ids },
          ),
        ),
        lastValueFrom(
          this.partnerService.send(
            { cmd: 'getClinicShiftById' },
            { clinic_id, shift_id },
          ),
        ),
      ]);

      if (!clinic || clinic.is_active === false) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Phòng khám không tồn tại hoặc đã ngừng hoạt động',
        });
      }

      if (!services || services.length !== service_ids.length) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Một hoặc nhiều dịch vụ không tồn tại hoặc không thuộc phòng khám này',
        });
      }
console.log("oluhya98u129e",shift);
console.log("98123ihahsd",services);

      if (!shift) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Ca khám không tồn tại hoặc không thuộc phòng khám này',
        });
      }

      // // 5. Verify pets belong to user
      // const pets = await lastValueFrom(
      //   this.customerService.send({ cmd: 'getUserPets' }, { pet_ids, user_id }),
      // );

      // if (pets.length !== pet_ids.length) {
      //   throw new RpcException({
      //     status: HttpStatus.FORBIDDEN,
      //     message: 'Một hoặc nhiều thú cưng không tồn tại hoặc không thuộc quyền sở hữu của bạn',
      //   });
      // }

      const appointmentDate = new Date(date);
      const newAppointmentData = {
        ...data,
        user_id,
        date: appointmentDate,
        shift: shift.data.shift,
        status: AppointmentStatus.Pending_Confirmation,
      };

      const result = await this.appointmentRepositories.create(newAppointmentData);

      const appointmentDateFormatted = appointmentDate.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      try {
        const user = await lastValueFrom(
          this.customerService.send(
            { cmd: 'getUserById' },
            { id: user_id }
          )
        );

        // Extract email correctly from the user object
        const userEmail = user.email?.email_address || user.email;
        const userName = user.full_name || user.username || 'Quý khách';
   
        const emailResponse = await lastValueFrom(
          this.authService.send(
            { cmd: 'sendAppointmentConfirmation' },
            {
              email: userEmail, 
              appointmentDetails: {
                userName: userName, 
                appointmentDate: appointmentDateFormatted,
                appointmentTime: `${shift.data.start_time} - ${shift.data.end_time}`,
                clinicName: clinic.data.clinic_name,
                clinicAddress: clinic.data.address,
                services: services.map(s => s.name),
                appointmentId: result.id
              }
            }
          )
        );
        
        if (!emailResponse?.success) {
          console.warn('Email notification might not have been sent successfully:', emailResponse?.message);
        }
      } catch (emailError) {
        console.error('Không thể gửi email xác nhận:', emailError);
      
      }
      
      return result;
    } catch (error) {
      if (error.code === 11000) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: 'Lịch hẹn của bạn bị trùng lặp.',
        });
      }

      if (error instanceof RpcException) {
        throw error;
      }

      console.error('Error creating appointment:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi không xác định khi tạo lịch hẹn',
      });
    }
  }

  async getUserAppointments(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    status: string;
    message: string;
    data: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      if (!userId) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Thiếu thông tin người dùng',
        });
      }

      const { data, total } = await this.appointmentRepositories.findByUserId(
        userId,
        page,
        limit,
      );

      const totalPages = Math.ceil(total / limit);

      return {
        status: 'success',
        message: 'Lấy danh sách lịch hẹn thành công',
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi lấy danh sách lịch hẹn',
      });
    }
  }
}
