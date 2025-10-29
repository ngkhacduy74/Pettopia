import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
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
      } = data;
      if (new_end <= new_start) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message:
            'Giờ kết thúc (end_time) phải lớn hơn giờ bắt đầu (start_time)',
        });
      }

      const boundaries = {
        [ClinicShiftType.MORNING]: { start: '05:00', end: '12:00' },
        [ClinicShiftType.AFTERNOON]: { start: '12:01', end: '18:00' },
        [ClinicShiftType.EVENING]: { start: '18:00', end: '23:59' },
      };

      const boundary = boundaries[shift];

      if (!boundary) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Loại ca làm việc không hợp lệ',
        });
      }

      if (new_start < boundary.start || new_end > boundary.end) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: `Thời gian ca ${shift} (${new_start} - ${new_end}) phải nằm hoàn toàn trong khoảng [${boundary.start} - ${boundary.end}]`,
        });
      }

      const allShifts =
        await this.shiftRepositories.getShiftsByClinicId(clinic_id);

      for (const existingShift of allShifts) {
        const exist_start = existingShift.start_time;
        const exist_end = existingShift.end_time;

        const isOverlapping = new_start < exist_end && new_end > exist_start;

        if (isOverlapping) {
          throw new RpcException({
            status: HttpStatus.CONFLICT,
            message: `Ca mới (${new_start} - ${new_end}) bị trùng với ca đã tồn tại (${existingShift.shift}: ${exist_start} - ${exist_end})`,
          });
        }
      }

      const result = await this.shiftRepositories.createClinicShift(data);
      if (!result) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Không thể tạo mới ca làm việc (lỗi repo)',
        });
      }

      return {
        success: true,
        message: 'Tạo ca làm việc thành công',
        data: result,
      };
    } catch (err) {
      if (err instanceof RpcException) {
        throw err;
      }

      if (err.name === 'ValidationError') {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: err.message,
        });
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi không xác định khi tạo ca làm việc',
      });
    }
  }
  async getClinicShifts(
    page: number,
    limit: number,
    clinic_id: string,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    try {
      return await this.shiftRepositories.getClinicShifts(
        page,
        limit,
        clinic_id,
      );
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi lấy danh sách ca làm việc của phòng khám',
      );
    }
  }
  async updateClinicShift(id: string, dto: UpdateClinicShiftDto): Promise<any> {
    try {
      const result = await this.shiftRepositories.updateClinicShift(id, dto);
      if (!result) {
        throw new NotFoundException(`Không tìm thấy ca làm việc với ID: ${id}`);
      }
      return {
        success: true,
        message: 'Cập nhật ca làm việc thành công',
        data: result,
      };
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        err.message || 'Lỗi không xác định khi cập nhật ca làm việc',
      );
    }
  }
  async getShiftsByClinicId(clinic_id: string): Promise<any[]> {
    try {
      const result =
        await this.shiftRepositories.getShiftsByClinicId(clinic_id);
      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi lấy ca làm việc theo ID phòng khám',
      );
    }
  }
}
