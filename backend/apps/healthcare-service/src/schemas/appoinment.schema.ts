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

function transformValue(doc: any, ret: any) {
  delete ret._id;
  delete ret.__v;
  return ret;
}

@Schema({
  timestamps: true,
  toJSON: { transform: transformValue },
  toObject: { transform: transformValue },
  _id: false,
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

  @Prop({
    type: String,
    required: true,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'customer_id phải là UUIDv4 hợp lệ',
    ],
  })
  customer_id: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'pet_id phải là UUIDv4 hợp lệ',
    ],
  })
  pet_id: string;

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

  @Prop({
    type: String,
    required: true,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'vet_id phải là UUIDv4 hợp lệ',
    ],
  })
  vet_id: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'service_id phải là UUIDv4 hợp lệ',
    ],
  })
  service_id: string;

  @Prop({
    type: Date,
    required: true,
    validate: {
      validator: (value: Date) =>
        value instanceof Date && !isNaN(value.getTime()),
      message: 'appointment_time phải là ngày hợp lệ',
    },
  })
  appointment_time: Date;

  @Prop({
    type: String,
    enum: AppointmentStatus,
    required: true,
    default: AppointmentStatus.Pending_Confirmation,
  })
  status: AppointmentStatus;

  @Prop({
    type: String,
    enum: AppointmentCreatedBy,
    required: true,
  })
  created_by: AppointmentCreatedBy;

  @Prop({
    type: String,
    trim: true,
    maxlength: 500,
  })
  cancel_reason?: string;
}

export type AppointmentDocument = Appointment & Document;
export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
