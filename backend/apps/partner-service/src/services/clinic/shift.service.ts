import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { CreateClinicShiftDto } from 'src/dto/clinic/create-shift.dto';
import { UpdateClinicShiftDto } from 'src/dto/clinic/update-shift.dto';
import { ShiftRepository } from 'src/repositories/clinic/shift.repositories';
import { ClinicShiftType } from 'src/schemas/clinic/clinic_shift_setting.schema';

@Injectable()
export class ShiftService {
  constructor(private readonly shiftRepositories: ShiftRepository) {}
  async createClinicShift(data: CreateClinicShiftDto): Promise<any> {
    try {
      const {
        start_time: new_start,
        end_time: new_end,
        shift,
        clinic_id,
        max_slot
      } = data;
      
      let normalizedShift: string = '';
      if (shift) {
        normalizedShift = shift.charAt(0).toUpperCase() + shift.slice(1).toLowerCase();
      }

      if (!shift || !clinic_id || !max_slot || !new_start || !new_end) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Vui lòng điền đầy đủ thông tin bắt buộc (shift, clinic_id, max_slot, start_time, end_time)',
          error: 'Bad Request'
        });
      }

      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(new_start) || !timeRegex.test(new_end)) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Định dạng thời gian không hợp lệ. Vui lòng sử dụng định dạng HH:mm (ví dụ: 09:00)',
          error: 'Bad Request'
        });
      }
      const [startHours, startMinutes] = new_start.split(':').map(Number);
      const [endHours, endMinutes] = new_end.split(':').map(Number);
      const startInMinutes = startHours * 60 + startMinutes;
      const endInMinutes = endHours * 60 + endMinutes;

      if (endInMinutes <= startInMinutes) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Giờ kết thúc phải lớn hơn giờ bắt đầu',
          error: 'Bad Request'
        });
      }
      const boundaries = {
        [ClinicShiftType.MORNING]: { start: '05:00', end: '12:00' },
        [ClinicShiftType.AFTERNOON]: { start: '12:01', end: '18:00' },
        [ClinicShiftType.EVENING]: { start: '18:00', end: '23:59' },
      };
      if (!shift || !Object.values(ClinicShiftType).includes(normalizedShift as ClinicShiftType)) {
        const validShifts = Object.values(ClinicShiftType).join(', ');
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Loại ca làm việc không hợp lệ. Các giá trị hợp lệ là: ${validShifts}`,
          error: 'Bad Request'
        });
      }
      const shiftValue = normalizedShift as ClinicShiftType;

      const boundary = boundaries[shiftValue];
      if (!boundary) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Không tìm thấy thông tin giới hạn thời gian cho ca làm việc này',
          error: 'Bad Request'
        });
      }
      const [boundaryStartHours, boundaryStartMinutes] = boundary.start.split(':').map(Number);
      const [boundaryEndHours, boundaryEndMinutes] = boundary.end.split(':').map(Number);
      const boundaryStartInMinutes = boundaryStartHours * 60 + boundaryStartMinutes;
      const boundaryEndInMinutes = boundaryEndHours * 60 + boundaryEndMinutes;
      if (startInMinutes < boundaryStartInMinutes || endInMinutes > boundaryEndInMinutes) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Thời gian làm việc phải nằm trong khoảng ${boundary.start} - ${boundary.end} cho ca ${shiftValue}`,
          error: 'Bad Request'
        });
      }
      if (max_slot <= 0 || max_slot > 1000) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Số lượng slot phải lớn hơn 0 và nhỏ hơn hoặc bằng 1000',
          error: 'Bad Request'
        });
      }
      const allShifts = await this.shiftRepositories.getShiftsByClinicId(clinic_id);
      for (const existingShift of allShifts) {
        const [existStartHours, existStartMinutes] = existingShift.start_time.split(':').map(Number);
        const [existEndHours, existEndMinutes] = existingShift.end_time.split(':').map(Number);
        const existStartInMinutes = existStartHours * 60 + existStartMinutes;
        const existEndInMinutes = existEndHours * 60 + existEndMinutes;

        const isOverlapping = startInMinutes < existEndInMinutes && endInMinutes > existStartInMinutes;

        if (isOverlapping) {
          throw new RpcException({
            statusCode: HttpStatus.CONFLICT,
            message: `Ca mới (${new_start} - ${new_end}) bị trùng với ca đã tồn tại (${existingShift.shift}: ${existingShift.start_time} - ${existingShift.end_time})`,
            error: 'Conflict'
          });
        }
      }
      const result = await this.shiftRepositories.createClinicShift({
        ...data,
        shift: shiftValue 
      }).catch(error => {
        if (error.code === 11000) {
          throw new RpcException({
            statusCode: HttpStatus.CONFLICT,
            message: 'Ca làm việc đã tồn tại cho phòng khám này',
            error: 'Conflict'
          });
        }
        throw new RpcException({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lỗi khi tạo ca làm việc',
          error: 'Internal Server Error',
          details: error.message
        });
      });

      return {
        status: 'success',
        message: 'Tạo ca làm việc thành công',
        data: result
      };

    } catch (error) {

      if (error instanceof RpcException) {
        throw error;
      }
      
      if (error.status || error.statusCode) {
        throw new RpcException({
          statusCode: error.statusCode || error.status,
          message: error.message,
          error: error.error || 'Bad Request',
          ...(error.details && { details: error.details })
        });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new RpcException({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lỗi cơ sở dữ liệu khi tạo ca làm việc',
          error: 'Database Error',
          details: error.message
        });
      }

      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Đã xảy ra lỗi khi tạo ca làm việc',
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
  async getClinicShifts(
    page: number = 1,
    limit: number = 10,
    clinic_id: string,
  ): Promise<{ status: string; message: string; data: any[]; pagination: any }> {
    try {
      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1 || limit > 100) limit = 10;

      if (!clinic_id || typeof clinic_id !== 'string') {
        throw {
          status: HttpStatus.BAD_REQUEST,
          message: 'ID phòng khám không hợp lệ',
          error: 'Bad Request'
        };
      }

      const result = await this.shiftRepositories.getClinicShifts(
        page,
        limit,
        clinic_id,
      );

      return {
        status: 'success',
        message: 'Lấy danh sách ca làm việc thành công',
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit)
        }
      };
    } catch (error) {
      if (error instanceof RpcException || (error.status && error.message)) {
        throw new RpcException({
          status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message,
          error: error.error || 'Internal Server Error',
          ...(error.details && { details: error.details })
        });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lỗi kết nối cơ sở dữ liệu',
          error: 'Database Error',
          details: error.message
        });
      }
      
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Đã xảy ra lỗi khi lấy danh sách ca làm việc',
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
  async updateClinicShift(id: string, dto: UpdateClinicShiftDto): Promise<{ status: string; message: string; data: any }> {
    try {
      // Validate ID
      if (!id || typeof id !== 'string') {
        throw {
          status: HttpStatus.BAD_REQUEST,
          message: 'ID ca làm việc không hợp lệ',
          error: 'Bad Request'
        };
      }

      if (!dto || Object.keys(dto).length === 0) {
        throw {
          status: HttpStatus.BAD_REQUEST,
          message: 'Dữ liệu cập nhật không được để trống',
          error: 'Bad Request'
        };
      }

      if (dto.start_time || dto.end_time) {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        
        if (dto.start_time && !timeRegex.test(dto.start_time)) {
          throw {
            status: HttpStatus.BAD_REQUEST,
            message: 'Định dạng thời gian bắt đầu không hợp lệ. Vui lòng sử dụng định dạng HH:mm (ví dụ: 09:00)',
            error: 'Bad Request'
          };
        }
        
        if (dto.end_time && !timeRegex.test(dto.end_time)) {
          throw {
            status: HttpStatus.BAD_REQUEST,
            message: 'Định dạng thời gian kết thúc không hợp lệ. Vui lòng sử dụng định dạng HH:mm (ví dụ: 17:00)',
            error: 'Bad Request'
          };
        }
      }

      const result = await this.shiftRepositories.updateClinicShift(id, dto);
      
      if (!result) {
        throw {
          status: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy ca làm việc với ID: ${id}`,
          error: 'Not Found'
        };
      }
      
      return {
        status: 'success',
        message: 'Cập nhật ca làm việc thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException || (error.status && error.message)) {
        throw new RpcException({
          status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message,
          error: error.error || 'Internal Server Error',
          ...(error.details && { details: error.details })
        });
      }
      
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        // Handle duplicate key error
        if (error.code === 11000) {
          throw new RpcException({
            status: HttpStatus.CONFLICT,
            message: 'Ca làm việc đã tồn tại',
            error: 'Conflict',
            details: 'Không thể tạo ca làm việc trùng lặp'
          });
        }
        
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lỗi cơ sở dữ liệu khi cập nhật ca làm việc',
          error: 'Database Error',
          details: error.message
        });
      }
      
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Đã xảy ra lỗi khi cập nhật ca làm việc',
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
  async getShiftsByClinicId(clinic_id: string): Promise<{ status: string; message: string; data: any[] }> {
    try {
      // Validate clinic_id
      if (!clinic_id || typeof clinic_id !== 'string') {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'ID phòng khám không hợp lệ',
          error: 'Bad Request'
        });
      }

      const result = await this.shiftRepositories.getShiftsByClinicId(clinic_id);
      
      return {
        status: 'success',
        message: 'Lấy danh sách ca làm việc thành công',
        data: result
      };
    } catch (error) {
      if (error.name === 'CastError' || error.message?.includes('not found')) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy thông tin phòng khám với ID: ${clinic_id}`,
          error: 'Not Found'
        });
      }

      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        throw new RpcException({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lỗi kết nối cơ sở dữ liệu',
          error: 'Database Error',
          details: error.message
        });
      }

      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Đã xảy ra lỗi khi xử lý yêu cầu',
        error: 'Internal Server Error',
        details: error.message || 'Không có thông tin lỗi chi tiết'
      });
    }
  }
}
