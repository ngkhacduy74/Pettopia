import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as uuid from 'uuid';

export enum ScheduleStatus {
  Cancelled = 'cancelled',
  Active = 'active',
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
})
export class Vet_Schedule {
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
    type: Date,
    required: true,
    validate: {
      validator: (value: Date) =>
        value instanceof Date && !isNaN(value.getTime()),
      message: 'start_time phải là ngày hợp lệ',
    },
  })
  start_time: Date;

  @Prop({
    type: Date,
    required: true,
    validate: [
      {
        validator: (value: Date) =>
          value instanceof Date && !isNaN(value.getTime()),
        message: 'end_time phải là ngày hợp lệ',
      },
      {
        validator: function (this: Vet_Schedule, value: Date) {
          return !this.start_time || value > this.start_time;
        },
        message: 'end_time phải lớn hơn start_time',
      },
    ],
  })
  end_time: Date;

  @Prop({
    type: String,
    enum: ScheduleStatus,
    default: ScheduleStatus.Active,
    required: true,
  })
  status: ScheduleStatus;

  @Prop({
    type: String,
    trim: true,
  })
  note?: string;
}

export type VetScheduleDocument = Vet_Schedule & Document;
export const VetScheduleSchema = SchemaFactory.createForClass(Vet_Schedule);
