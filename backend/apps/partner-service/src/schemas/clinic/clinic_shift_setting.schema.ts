import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as uuid from 'uuid';

export enum ClinicShiftType {
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
  _id: false,
  versionKey: false,
})
export class Shift {
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
    enum: ClinicShiftType,
    required: true,
  })
  shift: ClinicShiftType;

  @Prop({
    type: Number,
    required: true,
    min: [1, 'max_slot phải lớn hơn 0'],
  })
  max_slot: number;

  @Prop({
    type: String,
    required: true,
    trim: true,
    match: [
      /^([0-1]\d|2[0-3]):([0-5]\d)$/,
      'start_time phải theo định dạng HH:mm (24h)',
    ],
  })
  start_time: string; 

 @Prop({
  type: String,
  required: true,
  trim: true,
  match: [
    /^([0-1]\d|2[0-3]):([0-5]\d)$/,
    'end_time phải theo định dạng HH:mm (24h)',
  ],
  validate: {
    validator: function (this: Shift, value: string) {
      if (!this.start_time) return true; 
      const [startHour, startMinute] = this.start_time.split(':').map(Number);
      const [endHour, endMinute] = value.split(':').map(Number);
      const startTotal = startHour * 60 + startMinute;
      const endTotal = endHour * 60 + endMinute;
      return endTotal > startTotal;
    },
    message: 'end_time phải lớn hơn start_time',
  },
})
end_time: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  is_active: boolean;
}

export type ShiftDocument = Shift & Document;
export const ShiftSchema = SchemaFactory.createForClass(Shift);
