import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsString,
  Matches,
  IsBoolean,
  Validate,
} from 'class-validator';
import { ClinicShiftType } from './create-shift.dto';

export class UpdateClinicShiftDto {
  @IsOptional()
  @IsEnum(ClinicShiftType, {
    message: 'shift phải là Morning, Afternoon, hoặc Evening',
  })
  shift?: ClinicShiftType;

  @IsOptional()
  @IsInt({ message: 'max_slot phải là số nguyên' })
  @Min(1, { message: 'max_slot phải lớn hơn 0' })
  max_slot?: number;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
    message: 'start_time phải theo định dạng HH:mm (24h)',
  })
  start_time?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
    message: 'end_time phải theo định dạng HH:mm (24h)',
  })
  end_time?: string;

  @IsOptional()
  @IsBoolean({ message: 'is_active phải là boolean' })
  is_active?: boolean;
}
