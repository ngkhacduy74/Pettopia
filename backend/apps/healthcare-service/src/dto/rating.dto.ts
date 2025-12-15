import { Expose } from 'class-transformer';
import {
  IsInt,
  Max,
  Min,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateClinicRatingDto {
  @Expose()
  @IsInt({ message: 'stars phải là số nguyên' })
  @Min(1, { message: 'stars tối thiểu là 1' })
  @Max(5, { message: 'stars tối đa là 5' })
  stars: number;

  @Expose()
  @IsOptional()
  @IsString({ message: 'notes phải là chuỗi' })
  @MaxLength(1000, {
    message: 'notes không được vượt quá 1000 ký tự',
  })
  notes?: string;

  @Expose()
  @IsOptional()
  @IsArray({ message: 'service_ids phải là mảng' })
  @IsUUID('4', {
    each: true,
    message: 'Mỗi service_id trong service_ids phải là UUID v4 hợp lệ',
  })
  service_ids?: string[];
}


