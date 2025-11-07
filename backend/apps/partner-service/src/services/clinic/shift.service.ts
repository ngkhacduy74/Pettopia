import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { createRpcError } from 'src/common/error.detail';

import { CreateClinicShiftDto } from 'src/dto/clinic/shift/create-shift.dto';
import { UpdateClinicShiftDto } from 'src/dto/clinic/shift/update-shift.dto';
import { ClinicsRepository } from 'src/repositories/clinic/clinic.repositories';
import { ShiftRepository } from 'src/repositories/clinic/shift.repositories';
import { ClinicShiftType } from 'src/schemas/clinic/clinic_shift_setting.schema';
import { ClinicService } from './clinic.service';

@Injectable()
export class ShiftService {
  constructor(
    private readonly shiftRepositories: ShiftRepository,
    private readonly clinicRepositories: ClinicsRepository,
    private readonly clinicService: ClinicService,
    @Inject('CUSTOMER_SERVICE') private readonly customerService: ClientProxy,
  ) {}

  async getClinicShiftById(clinic_id: string, shift_id: string): Promise<any> {
    try {
      if (!clinic_id || !shift_id) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Thiếu thông tin phòng khám hoặc ca làm việc',
          'Bad Request',
        );
      }

      // Get the shift by ID and clinic_id
      const shift = await this.shiftRepositories.getShiftByIdAndClinic(shift_id, clinic_id);
      
      if (!shift) {
        return null;
      }

      return shift;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi khi lấy thông tin ca làm việc',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async createClinicShift(data: CreateClinicShiftDto): Promise<any> {
    // Lưu ý hàm tạo shift sẽ đều phải mapping từ user sang clinic id
    // Sẽ có hàm so sánh phía dưới
    try {
      const {
        start_time: new_start,
        end_time: new_end,
        shift,
        clinic_id,
        max_slot,
      } = data;
      console.log("ahsjhasd",data)
      let normalizedShift: string = '';
      if (shift) {
        normalizedShift =
          shift.charAt(0).toUpperCase() + shift.slice(1).toLowerCase();
      }

      if (!shift || !clinic_id || !max_slot || !new_start || !new_end) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Vui lòng điền đầy đủ thông tin bắt buộc (shift, clinic_id, max_slot, start_time, end_time)',
          'Bad Request',
        );
      }

      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(new_start) || !timeRegex.test(new_end)) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Định dạng thời gian không hợp lệ. Vui lòng sử dụng định dạng HH:mm (ví dụ: 09:00)',
          'Bad Request',
        );
      }
      const [startHours, startMinutes] = new_start.split(':').map(Number);
      const [endHours, endMinutes] = new_end.split(':').map(Number);
      const startInMinutes = startHours * 60 + startMinutes;
      const endInMinutes = endHours * 60 + endMinutes;

      if (endInMinutes <= startInMinutes) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Giờ kết thúc phải lớn hơn giờ bắt đầu',
          'Bad Request',
        );
      }
      const boundaries = {
        [ClinicShiftType.MORNING]: { start: '05:00', end: '12:00' },
        [ClinicShiftType.AFTERNOON]: { start: '12:01', end: '18:00' },
        [ClinicShiftType.EVENING]: { start: '18:00', end: '23:59' },
      };
      if (
        !shift ||
        !Object.values(ClinicShiftType).includes(
          normalizedShift as ClinicShiftType,
        )
      ) {
        const validShifts = Object.values(ClinicShiftType).join(', ');
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          `Loại ca làm việc không hợp lệ. Các giá trị hợp lệ là: ${validShifts}`,
          'Bad Request',
        );
      }
      const shiftValue = normalizedShift as ClinicShiftType;

      const boundary = boundaries[shiftValue];
      if (!boundary) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Không tìm thấy thông tin giới hạn thời gian cho ca làm việc này',
          'Bad Request',
        );
      }
      const [boundaryStartHours, boundaryStartMinutes] = boundary.start
        .split(':')
        .map(Number);
      const [boundaryEndHours, boundaryEndMinutes] = boundary.end
        .split(':')
        .map(Number);
      const boundaryStartInMinutes =
        boundaryStartHours * 60 + boundaryStartMinutes;
      const boundaryEndInMinutes = boundaryEndHours * 60 + boundaryEndMinutes;
      if (
        startInMinutes < boundaryStartInMinutes ||
        endInMinutes > boundaryEndInMinutes
      ) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          `Thời gian làm việc phải nằm trong khoảng ${boundary.start} - ${boundary.end} cho ca ${shiftValue}`,
          'Bad Request',
        );
      }
      if (max_slot <= 0) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Số lượng slot phải lớn hơn 0 ',
          'Bad Request',
        );
      }
      const { data: allShifts } =
        await this.shiftRepositories.getShiftsByClinicId(clinic_id);
      for (const existingShift of allShifts) {
        const [existStartHours, existStartMinutes] = existingShift.start_time
          .split(':')
          .map(Number);
        const [existEndHours, existEndMinutes] = existingShift.end_time
          .split(':')
          .map(Number);
        const existStartInMinutes = existStartHours * 60 + existStartMinutes;
        const existEndInMinutes = existEndHours * 60 + existEndMinutes;

        const isOverlapping =
          startInMinutes < existEndInMinutes &&
          endInMinutes > existStartInMinutes;

        if (isOverlapping) {
          throw createRpcError(
            HttpStatus.CONFLICT,
            `Ca mới (${new_start} - ${new_end}) bị trùng với ca đã tồn tại (${existingShift.shift}: ${existingShift.start_time} - ${existingShift.end_time})`,
            'Conflict',
          );
        }
      }
      const user = await lastValueFrom(
        this.customerService.send(
          { cmd: 'getUserById' },
          { id: data.clinic_id },
        ),
      ).catch((error) => {
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Không lấy được thông tin người dùng',
          'Internal Server Error',
          error.message,
        );
      });
      if (!user) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy người dùng',
          'NOT_FOUND',
        );
      }
      const clinic = await this.clinicRepositories.getClinicByEmail(
        user.email.email_address,
      );
      const result = await this.shiftRepositories
        .createClinicShift({
          ...data,
          clinic_id: clinic.id,
          shift: shiftValue,
        })
        .catch((error) => {
          if (error.code === 11000) {
            throw createRpcError(
              HttpStatus.CONFLICT,
              'Ca làm việc đã tồn tại cho phòng khám này',
              'Conflict',
            );
          }
          throw createRpcError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            'Lỗi khi tạo ca làm việc',
            'Internal Server Error',
            error.message,
          );
        });
      const clinic_check =
        await this.clinicService.triggerToCheckActiveClinic(clinic.id);
      return {
        status: 'success',
        message: 'Tạo ca làm việc thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      if (error.status || error.statusCode) {
        throw createRpcError(
          error.statusCode || error.status,
          error.message,
          error.error || 'Bad Request',
          error.details,
        );
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi tạo ca làm việc',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async getClinicShifts(
    page: number = 1,
    limit: number = 10,
    clinic_id: string,
  ): Promise<{
    status: string;
    message: string;
    data: any[];
    pagination: any;
  }> {
    try {
      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1 || limit > 100) limit = 10;

      // chuyển đổi từ user_id thành clinic_id

      const user = await lastValueFrom(
        this.customerService.send({ cmd: 'getUserById' }, { id: clinic_id }),
      ).catch((error) => {
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Không lấy được thông tin người dùng',
          'Internal Server Error',
          error.message,
        );
      });
      console.log('klajhsdkjasd', user);
      if (!user) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy người dùng',
          'NOT_FOUND',
        );
      }
      const clinic = await this.clinicRepositories.getClinicByEmail(
        user.email.email_address,
      );
      console.log('ljasldkjasdlkj', clinic);
      const result = await this.shiftRepositories.getClinicShifts(
        page,
        limit,
        clinic.id,
      );

      return {
        status: 'success',
        message: 'Lấy danh sách ca làm việc thành công',
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      };
    } catch (error) {
      if (error instanceof RpcException || (error.status && error.message)) {
        throw createRpcError(
          error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          error.message,
          error.error || 'Internal Server Error',
          error.details,
        );
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi lấy danh sách ca làm việc',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async updateClinicShift(
    id: string,
    dto: UpdateClinicShiftDto,
  ): Promise<{ status: string; message: string; data: any }> {
    try {
      if (!id || typeof id !== 'string') {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID ca làm việc không hợp lệ',
          'Bad Request',
        );
      }

      if (!dto || Object.keys(dto).length === 0) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Dữ liệu cập nhật không được để trống',
          'Bad Request',
        );
      }

      if (dto.start_time || dto.end_time) {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (dto.start_time && !timeRegex.test(dto.start_time)) {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Định dạng thời gian bắt đầu không hợp lệ. Vui lòng sử dụng định dạng HH:mm (ví dụ: 09:00)',
            'Bad Request',
          );
        }

        if (dto.end_time && !timeRegex.test(dto.end_time)) {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Định dạng thời gian kết thúc không hợp lệ. Vui lòng sử dụng định dạng HH:mm (ví dụ: 17:00)',
            'Bad Request',
          );
        }
      }

      const result = await this.shiftRepositories.updateClinicShift(id, dto);

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy ca làm việc với ID: ${id}`,
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: 'Cập nhật ca làm việc thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException || (error.status && error.message)) {
        throw createRpcError(
          error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          error.message,
          error.error || 'Internal Server Error',
          error.details,
        );
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        if (error.code === 11000) {
          throw createRpcError(
            HttpStatus.CONFLICT,
            'Ca làm việc đã tồn tại',
            'Conflict',
            'Không thể tạo ca làm việc trùng lặp',
          );
        }
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật ca làm việc',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async deleteShift(id: string, clinic_id: string): Promise<{ status: string; message: string }> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID ca làm việc không hợp lệ',
          'Bad Request',
        );
      }

      if (!clinic_id || typeof clinic_id !== 'string') {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID phòng khám không hợp lệ',
          'Bad Request',
        );
      }

      const shift = await this.shiftRepositories.getShiftById(id);
      if (!shift) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy ca làm việc',
          'Not Found',
        );
      }

      if (shift.clinic_id !== clinic_id) {
        throw createRpcError(
          HttpStatus.FORBIDDEN,
          'Bạn không có quyền xóa ca làm việc này',
          'Forbidden',
        );
      }

      const deleteResult = await this.shiftRepositories.deleteClinicShift(id);
      
      if (!deleteResult || deleteResult.deletedCount === 0) {
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Không thể xóa ca làm việc',
          'Internal Server Error',
        );
      }
      console.log("ládljasd",clinic_id)
      const trigger = await this.clinicService.triggerToCheckActiveClinic(clinic_id);
      console.log("0918273ojasd",trigger)

      return {
        status: 'success',
        message: 'Xóa ca làm việc thành công',
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      if (error.status || error.statusCode) {
        throw createRpcError(
          error.statusCode || error.status,
          error.message,
          error.error || 'Bad Request',
          error.details,
        );
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi xóa ca làm việc',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async getShiftsByClinicId(
    clinic_id: string,
  ): Promise<{ status: string; message: string; data: any[] }> {
    try {
      if (!clinic_id || typeof clinic_id !== 'string') {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID phòng khám không hợp lệ',
          'Bad Request',
        );
      }

      const { data: shifts } = await this.shiftRepositories.getShiftsByClinicId(clinic_id);

      return {
        status: 'success',
        message: 'Lấy danh sách ca làm việc thành công',
        data: shifts,
      };
    } catch (error) {
      if (error.name === 'CastError' || error.message?.includes('not found')) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy thông tin phòng khám với ID: ${clinic_id}`,
          'Not Found',
        );
      }

      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi xử lý yêu cầu',
        'Internal Server Error',
        error.message || 'Không có thông tin lỗi chi tiết',
      );
    }
  }
}
