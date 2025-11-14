import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
  CancelAppointmentDto,
} from 'src/dto/appointment.dto';
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

  // Helper function để kiểm tra role (hỗ trợ cả string và array)
  private hasRole(userRole: string | string[], targetRole: string): boolean {
    if (Array.isArray(userRole)) {
      return userRole.some((r) => r === targetRole);
    }
    return userRole === targetRole;
  }

  // Helper function để kiểm tra có phải Admin hoặc Staff không
  private isAdminOrStaff(userRole: string | string[]): boolean {
    return this.hasRole(userRole, 'Admin') || this.hasRole(userRole, 'Staff');
  }

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
          message:
            'Một hoặc nhiều dịch vụ không tồn tại hoặc không thuộc phòng khám này',
        });
      }
      console.log('oluhya98u129e', shift);
      console.log('98123ihahsd', services);

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

      const result =
        await this.appointmentRepositories.create(newAppointmentData);

      const appointmentDateFormatted = appointmentDate.toLocaleDateString(
        'vi-VN',
        {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        },
      );
      try {
        const user = await lastValueFrom(
          this.customerService.send({ cmd: 'getUserById' }, { id: user_id }),
        );

        // Extract email correctly from the user object
        const userEmail = user.email?.email_address || user.email;
        const userName = user.full_name || user.username || 'Quý khách';

        await lastValueFrom(
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
                services: services.map((s) => s.name),
                appointmentId: result.id,
              },
            },
          ),
        );
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

  async getAppointments(
    role: string | string[],
    userId?: string,
    clinicId?: string,
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
      let result: { data: any[]; total: number };

      // Phân quyền dựa trên role
      if (this.hasRole(role, 'User')) {
        // USER: chỉ xem appointments của chính mình
      if (!userId) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Thiếu thông tin người dùng',
        });
      }
        result = await this.appointmentRepositories.findByUserId(
        userId,
        page,
        limit,
      );
      } else if (this.hasRole(role, 'Clinic')) {
        // CLINIC: xem appointments của phòng khám mình
        if (!clinicId) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Thiếu thông tin phòng khám',
          });
        }
        result = await this.appointmentRepositories.findByClinicId(
          clinicId,
          page,
          limit,
        );
      } else if (this.isAdminOrStaff(role)) {
        // ADMIN/STAFF: xem tất cả appointments
        result = await this.appointmentRepositories.findAll(page, limit);
      } else {
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'Không có quyền truy cập',
        });
      }

      const totalPages = Math.ceil(result.total / limit);

      return {
        status: 'success',
        message: 'Lấy danh sách lịch hẹn thành công',
        data: result.data,
        pagination: {
          total: result.total,
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

  async updateAppointmentStatus(
    appointmentId: string,
    updateData: UpdateAppointmentStatusDto,
    updatedByUserId?: string,
  ): Promise<any> {
    try {
      // Kiểm tra appointment có tồn tại không
      const appointment = await this.appointmentRepositories.findById(
        appointmentId,
      );

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      // Nếu cập nhật thành Cancelled và có userId, lưu cancelled_by
      const cancelledBy =
        updateData.status === AppointmentStatus.Cancelled && updatedByUserId
          ? updatedByUserId
          : undefined;

      // Cập nhật trạng thái
      const updated = await this.appointmentRepositories.updateStatus(
        appointmentId,
        updateData.status,
        updateData.cancel_reason,
        cancelledBy,
      );

      if (!updated) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Không thể cập nhật trạng thái lịch hẹn',
        });
      }

      return updated;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi cập nhật trạng thái lịch hẹn',
      });
    }
  }

  async cancelAppointment(
    appointmentId: string,
    cancelledByUserId: string,
    role: string | string[],
    cancelData: CancelAppointmentDto,
    clinicId?: string,
  ): Promise<any> {
    try {
      // Kiểm tra appointment có tồn tại không
      const appointment = await this.appointmentRepositories.findById(
        appointmentId,
      );

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      // Phân quyền: kiểm tra ai có quyền hủy
      if (this.hasRole(role, 'User')) {
        // USER: chỉ hủy được appointment của chính mình
        if (appointment.user_id !== cancelledByUserId) {
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền hủy lịch hẹn này',
          });
        }
      } else if (this.hasRole(role, 'Clinic')) {
        // CLINIC: chỉ hủy được appointment của phòng khám mình
        if (!clinicId) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Thiếu thông tin phòng khám',
          });
        }
        if (appointment.clinic_id !== clinicId) {
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền hủy lịch hẹn này',
          });
        }
      } else if (!this.isAdminOrStaff(role)) {
        // ADMIN/STAFF: hủy được tất cả, các role khác không có quyền
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'Bạn không có quyền hủy lịch hẹn',
        });
      }

      // Kiểm tra appointment chưa bị hủy hoặc đã hoàn thành
      if (appointment.status === AppointmentStatus.Cancelled) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Lịch hẹn này đã bị hủy trước đó',
        });
      }

      if (appointment.status === AppointmentStatus.Completed) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Không thể hủy lịch hẹn đã hoàn thành',
        });
      }

      // Lấy lý do hủy từ cancelData (có thể là string hoặc undefined)
      const cancelReason = cancelData?.cancel_reason;
      
      // Log để debug
      console.log('Cancel reason:', cancelReason, 'Type:', typeof cancelReason);

      // Nếu status là Confirmed thì bắt buộc phải có lý do hủy
      if (appointment.status === AppointmentStatus.Confirmed) {
        if (!cancelReason || cancelReason.trim() === '') {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message:
              'Lịch hẹn đã được xác nhận, vui lòng nhập lý do hủy lịch hẹn',
          });
        }
      }

      // Cập nhật trạng thái thành Cancelled, lưu lý do (nếu có) và id người hủy
      // Nếu cancelReason là empty string, vẫn lưu (có thể là người dùng muốn xóa lý do cũ)
      const updated = await this.appointmentRepositories.updateStatus(
        appointmentId,
        AppointmentStatus.Cancelled,
        cancelReason, // Có thể là string, empty string, hoặc undefined
        cancelledByUserId,
      );

      if (!updated) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Không thể hủy lịch hẹn',
        });
      }

      return updated;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi hủy lịch hẹn',
      });
    }
  }

  async getAppointmentById(
    appointmentId: string,
    role: string | string[],
    userId?: string,
    clinicId?: string,
  ): Promise<any> {
    try {
      // Tìm appointment
      const appointment = await this.appointmentRepositories.findById(
        appointmentId,
      );

      if (!appointment) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy lịch hẹn',
        });
      }

      // Phân quyền dựa trên role
      if (this.hasRole(role, 'User')) {
        // USER: chỉ xem appointments của chính mình
        if (!userId) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Thiếu thông tin người dùng',
          });
        }
        if (appointment.user_id !== userId) {
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền xem lịch hẹn này',
          });
        }
      } else if (this.hasRole(role, 'Clinic')) {
        // CLINIC: chỉ xem appointments của phòng khám mình
        if (!clinicId) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: 'Thiếu thông tin phòng khám',
          });
        }
        if (appointment.clinic_id !== clinicId) {
          throw new RpcException({
            status: HttpStatus.FORBIDDEN,
            message: 'Bạn không có quyền xem lịch hẹn này',
          });
        }
      } else if (!this.isAdminOrStaff(role)) {
        // ADMIN/STAFF: xem được tất cả, các role khác không có quyền
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'Không có quyền truy cập',
        });
      }

      return appointment;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Lỗi khi lấy thông tin lịch hẹn',
      });
    }
  }
}
