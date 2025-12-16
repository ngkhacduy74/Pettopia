import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ClinicRating,
  ClinicRatingDocument,
} from 'src/schemas/rating.schema';

@Injectable()
export class RatingRepository {
  constructor(
    @InjectModel(ClinicRating.name)
    private readonly ratingModel: Model<ClinicRatingDocument>,
  ) {}

  async createRating(data: Partial<ClinicRating>): Promise<ClinicRating> {
    try {
      const created = new this.ratingModel(data);
      return await created.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new InternalServerErrorException(
          'Đánh giá cho lịch hẹn này đã tồn tại',
        );
      }
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi tạo đánh giá phòng khám',
      );
    }
  }

  async findByAppointmentId(
    appointment_id: string,
  ): Promise<ClinicRating | null> {
    try {
      return await this.ratingModel.findOne({ appointment_id }).lean();
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi tìm đánh giá theo lịch hẹn',
      );
    }
  }

  async getClinicRatingSummary(clinic_id: string): Promise<{
    clinic_id: string;
    average_stars: number;
    total_ratings: number;
  }> {
    try {
      const result = await this.ratingModel
        .aggregate([
          { $match: { clinic_id } },
          {
            $group: {
              _id: null,
              average_stars: { $avg: '$stars' },
              total_ratings: { $count: {} },
            },
          },
        ])
        .exec();

      if (!result || result.length === 0) {
        throw new NotFoundException('Chưa có đánh giá nào cho phòng khám này');
      }

      return {
        clinic_id,
        average_stars: Number(result[0].average_stars.toFixed(2)),
        total_ratings: result[0].total_ratings,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        error.message || 'Lỗi khi lấy thống kê đánh giá phòng khám',
      );
    }
  }
}


