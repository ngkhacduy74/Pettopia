import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as uuid from 'uuid';

export enum AppointmentStatus {
  Pending_Confirmation = 'Pending_Confirmation',
  Confirmed = 'Confirmed',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  No_Show = 'No_Show',
}

export enum AppointmentCreatedBy {
  Customer = 'customer',
  Partner = 'partner',
}

export enum AppointmentShift {
  MORNING = 'Morning',
  AFTERNOON = 'Afternoon',
  EVENING = 'Evening',
}

function transformValue(doc: any, ret: any) {
  delete ret._id;
  delete ret.__v;
  return ret;
}

@Schema({
  timestamps: true,
  toJSON: { transform: transformValue },
  toObject: { transform: transformValue },
  versionKey: false,
})
export class Appointment {
  @Prop({
    type: String,
    required: true,
    unique: true,
    default: () => uuid.v4(),
    trim: true,
  })
  id: string;

  // Người đặt lịch (khách hàng)
  @Prop({
    type: String,
    required: true,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'customer_id phải là UUIDv4 hợp lệ',
    ],
  })
  user_id: string;

  // ID của customer (người dùng role User)
  @Prop({
    type: String,
    required: false,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'customer phải là UUIDv4 hợp lệ',
    ],
  })
  customer?: string;

  // ID của partner (người dùng role Clinic, Staff, Admin)
  @Prop({
    type: String,
    required: false,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'partner phải là UUIDv4 hợp lệ',
    ],
  })
  partner?: string;

  // Email của customer (dùng khi customer chưa có tài khoản)
  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  customer_email?: string;

  // Số điện thoại của customer (dùng khi customer chưa có tài khoản)
  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  customer_phone?: string;

  @Prop({
    type: [String],
    required: false,
    trim: true,
    validate: {
      validator: function (values: string[]) {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
        return values.every((value) => uuidRegex.test(value));
      },
      message: 'Tất cả pet_id phải là UUIDv4 hợp lệ',
    },
  })
  pet_ids?: string[];

  // Phòng khám
  @Prop({
    type: String,
    required: true,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'clinic_id phải là UUIDv4 hợp lệ',
    ],
  })
  clinic_id: string;

  // Bác sĩ - có thể chưa chỉ định ở giai đoạn này
  @Prop({
    type: String,
    required: false,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'vet_id phải là UUIDv4 hợp lệ',
    ],
  })
  vet_id?: string;

  @Prop({
    type: [
      {
        type: String,
        trim: true,
        match: [
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
          'Mỗi service_id trong mảng phải là UUIDv4 hợp lệ',
        ],
      },
    ],
    required: false,
  })
  service_ids?: string[];
  @Prop({
    type: Date,
    required: true,
    validate: {
      validator: (value: Date) =>
        value instanceof Date && !isNaN(value.getTime()),
      message: 'date phải là ngày hợp lệ',
    },
  })
  date: Date;

  // Ca khám
  @Prop({
    type: String,
    enum: AppointmentShift,
    required: true,
  })
  shift: AppointmentShift;

  // Trạng thái lịch hẹn
  @Prop({
    type: String,
    enum: AppointmentStatus,
    required: true,
    default: AppointmentStatus.Pending_Confirmation,
  })
  status: AppointmentStatus;

  // Ai tạo đơn này (customer/partner)
  @Prop({
    type: String,
    enum: AppointmentCreatedBy,
    required: false,
  })
  created_by?: AppointmentCreatedBy;

  // Lý do hủy nếu có
  @Prop({
    type: String,
    trim: true,
    maxlength: 500,
  })
  cancel_reason?: string;

  // ID của người hủy lịch hẹn
  @Prop({
    type: String,
    required: false,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'cancelled_by phải là UUIDv4 hợp lệ',
    ],
  })
  cancelled_by?: string;
  toObject: any;
}

export type AppointmentDocument = Appointment & Document;
export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
