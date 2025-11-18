import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import * as uuid from 'uuid';
import { createRpcError } from 'src/common/error.detail';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
  CancelAppointmentDto,
  CreateAppointmentForCustomerDto,
} from 'src/dto/appointment.dto';
import { AppointmentRepository } from '../repositories/appointment.repositories';
import {
  AppointmentStatus,
  AppointmentShift,
  AppointmentCreatedBy,
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

      // Lấy thông tin user để xác định role
      const user = await lastValueFrom(
        this.customerService.send({ cmd: 'getUserById' }, { id: user_id }),
      ).catch(() => null);

      if (!user) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy thông tin người dùng',
        });
      }

      // Xác định customer và partner dựa trên role
      const userRole = user.role || [];
      const isUserRole = this.hasRole(userRole, 'User');
      const isPartnerRole =
        this.hasRole(userRole, 'Clinic') ||
        this.hasRole(userRole, 'Staff') ||
        this.hasRole(userRole, 'Admin');

      const appointmentDate = new Date(date);
      const newAppointmentData: any = {
        ...data,
        user_id,
        date: appointmentDate,
        shift: shift.data.shift,
        status: AppointmentStatus.Pending_Confirmation,
      };

      // Gán customer hoặc partner dựa trên role
      if (isUserRole) {
        newAppointmentData.customer = user_id;
        newAppointmentData.created_by = AppointmentCreatedBy.Customer;
      } else if (isPartnerRole) {
        newAppointmentData.partner = user_id;
        newAppointmentData.created_by = AppointmentCreatedBy.Partner;
      }

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

        this.authService.emit(
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
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

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
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

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
      const appointment =
        await this.appointmentRepositories.findById(appointmentId);

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

  async createAppointmentForCustomer(
    data: CreateAppointmentForCustomerDto,
    partner_id: string,
  ): Promise<any> {
    const {
      clinic_id,
      service_ids,
      pet_ids,
      shift_id,
      date,
      customer_email,
      customer_phone,
    } = data;

    try {
      // Kiểm tra partner có quyền (phải là Clinic, Staff, hoặc Admin)
      let partner;
      try {
        partner = await lastValueFrom(
          this.customerService.send({ cmd: 'getUserById' }, { id: partner_id }),
        );
      } catch (error) {
        console.error('Error getting partner info:', error);
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy thông tin partner: ${error.message || 'Lỗi khi lấy thông tin người dùng'}`,
          'Partner Not Found',
          { partner_id, originalError: error.message },
        );
      }

      if (!partner) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy thông tin partner',
          'Partner Not Found',
          { partner_id },
        );
      }

      const partnerRole = partner.role || [];
      const isPartnerRole =
        this.hasRole(partnerRole, 'Clinic') ||
        this.hasRole(partnerRole, 'Staff') ||
        this.hasRole(partnerRole, 'Admin');

      if (!isPartnerRole) {
        throw createRpcError(
          HttpStatus.FORBIDDEN,
          'Chỉ có Clinic, Staff hoặc Admin mới có quyền đặt lịch hộ',
          'Permission Denied',
          {
            partner_id,
            partner_roles: partnerRole,
          },
        );
      }

      // Validate clinic, services, shift
      let clinic, services, shift;
      try {
        [clinic, services, shift] = await Promise.all([
          lastValueFrom(
            this.partnerService.send(
              { cmd: 'getClinicById' },
              { id: clinic_id },
            ),
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
      } catch (error) {
        console.error('Error validating clinic/services/shift:', error);
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          `Lỗi khi xác thực thông tin: ${error.message || 'Không thể lấy thông tin phòng khám, dịch vụ hoặc ca khám'}`,
          'Validation Error',
          {
            clinic_id,
            service_ids,
            shift_id,
            originalError: error.message,
          },
        );
      }

      const clinicData = clinic?.data || clinic;
      if (!clinicData || clinicData.is_active === false) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Phòng khám không tồn tại hoặc đã ngừng hoạt động',
          'Clinic Not Found',
          { clinic_id, clinic_response: clinic },
        );
      }

      if (!services || services.length !== service_ids.length) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Một hoặc nhiều dịch vụ không tồn tại hoặc không thuộc phòng khám này',
          'Invalid Services',
          {
            clinic_id,
            requested_service_ids: service_ids,
            found_services_count: services?.length || 0,
            services_response: services,
          },
        );
      }

      const shiftData = shift?.data || shift;
      if (!shiftData) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Ca khám không tồn tại hoặc không thuộc phòng khám này',
          'Shift Not Found',
          { clinic_id, shift_id, shift_response: shift },
        );
      }

      // Tìm user theo email hoặc phone
      let customerUser: any = null;

      // Thử tìm theo email trước
      try {
        const userByEmail = await lastValueFrom(
          this.customerService.send(
            { cmd: 'getUserByEmailForAuth' },
            { email_address: customer_email },
          ),
        );

        // getUserByEmailForAuth trả về User object nếu tìm thấy
        if (userByEmail && userByEmail.id) {
          customerUser = userByEmail;
        }
      } catch (error) {
        // Không tìm thấy theo email, thử tìm theo phone
        try {
          const usersByPhone = await lastValueFrom(
            this.customerService.send(
              { cmd: 'getAllUsers' },
              {
                page: 1,
                limit: 1,
                phone_number: customer_phone,
              },
            ),
          );

          if (
            usersByPhone &&
            usersByPhone.items &&
            usersByPhone.items.length > 0
          ) {
            customerUser = usersByPhone.items[0];
          }
        } catch (phoneError) {
          // User không tồn tại, sẽ tạo appointment với email và phone
          console.log(
            'User không tồn tại, sẽ tạo appointment với thông tin liên hệ',
          );
        }
      }

      const appointmentDate = new Date(date);

      const newAppointmentData: any = {
        clinic_id,
        service_ids,
        pet_ids,
        date: appointmentDate,
        shift: shiftData.shift || shiftData.shift_name,
        partner: partner_id,
        created_by: AppointmentCreatedBy.Partner,
      };

      if (customerUser) {
        // User đã tồn tại: gán customer và user_id
        newAppointmentData.user_id = customerUser.id;
        newAppointmentData.customer = customerUser.id;
        newAppointmentData.status = AppointmentStatus.Confirmed;
      } else {
        // User chưa tồn tại: lưu email và phone, status = Confirmed
        // Tạo một user_id tạm thời hoặc để null (nhưng schema yêu cầu user_id)
        // Tạm thời tạo một UUID tạm hoặc sử dụng một giá trị đặc biệt
        // Tốt nhất là tạo một user_id placeholder hoặc để null nếu có thể
        // Vì schema yêu cầu user_id, ta sẽ tạo một UUID tạm
        const tempUserId = uuid.v4();
        newAppointmentData.user_id = tempUserId; // UUID tạm
        newAppointmentData.customer_email = customer_email;
        newAppointmentData.customer_phone = customer_phone;
        newAppointmentData.status = AppointmentStatus.Confirmed;
      }

      const result =
        await this.appointmentRepositories.create(newAppointmentData);

      // Gửi email xác nhận đặt lịch thành công (cho cả user có tài khoản và chưa có tài khoản)
      try {
        const appointmentDateFormatted = appointmentDate.toLocaleDateString(
          'vi-VN',
          {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          },
        );

        // Xác định email và tên người dùng
        let userEmail: string;
        let userName: string;

        if (customerUser) {
          // User đã có tài khoản
          userEmail = customerUser.email?.email_address || customerUser.email;
          userName =
            customerUser.fullname || customerUser.username || 'Quý khách';
        } else {
          // User chưa có tài khoản, sử dụng email và tên mặc định
          userEmail = customer_email;
          userName = 'Quý khách';
        }

        // Format địa chỉ clinic để phù hợp với email template
        const clinicAddress = clinicData.address
          ? {
              description:
                clinicData.address.detail ||
                clinicData.address.description ||
                '',
              ward: clinicData.address.ward || '',
              district: clinicData.address.district || '',
              city: clinicData.address.city || '',
            }
          : {
              description: '',
              ward: '',
              district: '',
              city: '',
            };

        this.authService.emit(
          { cmd: 'sendAppointmentConfirmation' },
          {
            email: userEmail,
            appointmentDetails: {
              userName: userName,
              appointmentDate: appointmentDateFormatted,
              appointmentTime: `${shiftData.start_time || shiftData.startTime} - ${shiftData.end_time || shiftData.endTime}`,
              clinicName: clinicData.clinic_name || clinicData.name,
              clinicAddress: clinicAddress,
              services: services.map((s) => s.name || s.service_name),
              appointmentId: result.id,
            },
          },
        );
      } catch (emailError) {
        console.error('Không thể gửi email xác nhận:', emailError);
      }

      return result;
    } catch (error) {
      console.error('Error creating appointment for customer:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        response: error.response,
      });

      if (error.code === 11000) {
        throw createRpcError(
          HttpStatus.CONFLICT,
          'Lịch hẹn bị trùng lặp.',
          'Duplicate Appointment',
          { errorCode: error.code },
        );
      }

      if (error instanceof RpcException) {
        throw error;
      }

      // Báo lỗi chi tiết với thông tin đầy đủ
      throw createRpcError(
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        error.message || 'Lỗi không xác định khi tạo lịch hẹn hộ khách hàng',
        error.name || 'Internal Server Error',
        {
          originalError: error.message,
          stack:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
          code: error.code,
        },
      );
    }
  }
}
