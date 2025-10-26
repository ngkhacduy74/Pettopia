import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Shift,
  ShiftDocument,
} from 'src/schemas/clinic/clinic_shift_setting.schema';
import { CreateClinicShiftDto } from 'src/dto/clinic/create-shift.dto';

@Injectable()
export class ShiftRepository {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
  ) {}

  async createClinicShift(dto: CreateClinicShiftDto): Promise<ShiftDocument> {
    try {
      const existingShift = await this.shiftModel.findOne({
        clinic_id: dto.clinic_id,
        shift: dto.shift,
      });

      if (existingShift) {
        throw new BadRequestException(
          `Ca làm việc '${dto.shift}' đã tồn tại cho phòng khám này`,
        );
      }

      const newShift = new this.shiftModel(dto);
      return await newShift.save();
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi tạo ca làm việc',
      );
    }
  }

  //   async getClinicShifts(
  //     page: number,
  //     limit: number,
  //     clinic_id?: string, // Thêm filter theo clinic_id nếu cần
  //   ): Promise<{ data: ShiftDocument[]; total: number }> {
  //     const skip = (page - 1) * limit;
  //     const query: any = {};

  //     if (clinic_id) {
  //       query.clinic_id = clinic_id;
  //     }

  //     try {
  //       const [data, total] = await Promise.all([
  //         this.shiftModel
  //           .find(query)
  //           .sort({ createdAt: -1 })
  //           .skip(skip)
  //           .limit(limit)
  //           .lean()
  //           .exec(),
  //         this.shiftModel.countDocuments(query).exec(),
  //       ]);

  //       return { data, total };
  //     } catch (err) {
  //       throw new InternalServerErrorException(
  //         err.message || 'Lỗi cơ sở dữ liệu khi lấy danh sách ca làm việc',
  //       );
  //     }
  //   }

  //   async updateClinicShift(
  //     id: string,
  //     dto: UpdateClinicShiftDto,
  //   ): Promise<ShiftDocument> {
  //     try {
  //       const updatedShift = await this.shiftModel
  //         .findOneAndUpdate({ id: id }, dto, { new: true })
  //         .exec();

  //       if (!updatedShift) {
  //         throw new NotFoundException(`Không tìm thấy ca làm việc với ID: ${id}`);
  //       }
  //       return updatedShift;
  //     } catch (err) {
  //       if (err instanceof NotFoundException) throw err;
  //       throw new InternalServerErrorException(
  //         err.message || 'Lỗi cơ sở dữ liệu khi cập nhật ca làm việc',
  //       );
  //     }
  //   }

  async deleteClinicShift(id: string): Promise<any> {
    try {
      const result = await this.shiftModel.deleteOne({ id: id }).exec();

      if (result.deletedCount === 0) {
        throw new NotFoundException(
          `Không tìm thấy ca làm việc với ID: ${id} để xóa`,
        );
      }
      return result;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi xóa ca làm việc',
      );
    }
  }
  async updateClinicShiftStatus(
    id: string,
    is_active: boolean,
  ): Promise<ShiftDocument> {
    try {
      const updatedShift = await this.shiftModel
        .findOneAndUpdate({ id: id }, { is_active: is_active }, { new: true })
        .exec();

      if (!updatedShift) {
        throw new NotFoundException(
          `Không tìm thấy ca làm việc với ID: ${id} để cập nhật trạng thái`,
        );
      }
      return updatedShift;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi cập nhật trạng thái ca làm việc',
      );
    }
  }
}
