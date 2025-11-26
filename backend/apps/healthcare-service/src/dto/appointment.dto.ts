import {
  IsUUID,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  ValidateIf,
  IsString,
  MaxLength,
  IsEmail,
  Matches,
} from 'class-validator';
import {
  AppointmentCreatedBy,
  AppointmentShift,
  AppointmentStatus,
} from 'src/schemas/appoinment.schema';

export class CreateAppointmentDto {
  @IsArray({ message: 'pet_ids phải là mảng UUID' })
  @IsUUID('4', { each: true, message: 'Mỗi pet_id phải là UUID v4 hợp lệ' })
  @IsOptional()
  pet_ids?: string[];

  @IsUUID('4', { message: 'clinic_id phải là UUID v4 hợp lệ' })
  clinic_id: string;

  @IsArray({ message: 'service_ids phải là mảng UUID' })
  @IsOptional()
  @IsUUID('4', { each: true, message: 'Mỗi service_id phải là UUID v4 hợp lệ' })
  service_ids?: string[];

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

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus, {
    message:
      'status phải là một trong các giá trị: Pending_Confirmation, Confirmed, In_Progress, Completed, Cancelled, No_Show',
  })
  status: AppointmentStatus;

  @IsOptional()
  @IsString({ message: 'cancel_reason phải là chuỗi' })
  @MaxLength(500, { message: 'cancel_reason không được vượt quá 500 ký tự' })
  cancel_reason?: string;
}

export class CancelAppointmentDto {
  @IsOptional()
  @IsString({ message: 'cancel_reason phải là chuỗi' })
  @MaxLength(500, { message: 'cancel_reason không được vượt quá 500 ký tự' })
  cancel_reason?: string;
}

export class CreateAppointmentForCustomerDto {
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

  // Thông tin customer (bắt buộc khi partner đặt lịch hộ)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  customer_email: string;

  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  @Matches(/^(0|\+84)\d{9}$/, {
    message: 'Số điện thoại phải đúng định dạng của Việt Nam',
  })
  customer_phone: string;
}
