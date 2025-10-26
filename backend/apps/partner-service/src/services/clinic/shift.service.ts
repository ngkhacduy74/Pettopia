import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { CreateClinicShiftDto } from 'src/dto/clinic/create-shift.dto';
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
}
