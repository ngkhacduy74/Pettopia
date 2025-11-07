import {
  IsUUID,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import {
  AppointmentCreatedBy,
  AppointmentShift,
} from 'src/schemas/appoinment.schema';

export class CreateAppointmentDto {
  @IsArray({ message: 'pet_ids phải là mảng UUID' })
  @ArrayNotEmpty({ message: 'pet_ids không được để trống' })
  @IsUUID('4', { each: true, message: 'Mỗi pet_id phải là UUID v4 hợp lệ' })
  pet_ids: string[];

  @IsUUID('4', { message: 'clinic_id phải là UUID v4 hợp lệ' })
  clinic_id: string;

  @IsArray({ message: 'service_ids phải là mảng UUID' })
  @ArrayNotEmpty({ message: 'service_ids không được để trống' })
  @IsUUID('4', { each: true, message: 'Mỗi service_id phải là UUID v4 hợp lệ' })
  service_ids: string[];

  @IsDateString({}, { message: 'date phải đúng định dạng ngày (YYYY-MM-DD)' })
  date: string | Date;

  @IsUUID('4', { message: 'shift_id phải là UUID v4 hợp lệ' })
  shift_id: string;

  @IsOptional()
  @IsEnum(AppointmentShift, {
    message: 'shift phải là Morning hoặc Afternoon hoặc Evening',
  })
  shift?: AppointmentShift;

  @IsOptional()
  @IsEnum(AppointmentCreatedBy, {
    message: 'created_by phải là customer hoặc partner',
  })
  created_by?: AppointmentCreatedBy;
}
