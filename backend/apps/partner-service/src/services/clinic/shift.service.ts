import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { CreateClinicShiftDto } from 'src/dto/clinic/create-shift.dto';
import { UpdateClinicShiftDto } from 'src/dto/clinic/update-shift.dto';
import { ShiftRepository } from 'src/repositories/clinic/shift.repositories';

@Injectable()
export class ShiftService {
  constructor(private readonly shiftRepositories: ShiftRepository) {}
  async createClinicShift(data: CreateClinicShiftDto): Promise<any> {
    try {
      const result = await this.shiftRepositories.createClinicShift(data);
      if (!result) {
        throw new BadRequestException('Không thể tạo mới ca làm việc');
      }
      return {
        success: true,
        message: 'Tạo ca làm việc thành công',
        data: result,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi không xác định khi tạo ca làm việc',
      );
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
}
