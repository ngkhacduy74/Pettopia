import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as uuid from 'uuid';

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
export class Service {
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
    minlength: [2, 'Tên dịch vụ phải có ít nhất 2 ký tự'],
    maxlength: [100, 'Tên dịch vụ không được vượt quá 100 ký tự'],
  })
  name: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: [1000, 'Mô tả dịch vụ không được vượt quá 1000 ký tự'],
  })
  description?: string;

  @Prop({
    type: Number,
    required: true,
    min: [0, 'Giá dịch vụ không được nhỏ hơn 0'],
    max: [1_000_000_000, 'Giá dịch vụ không được vượt quá 1 tỷ'],
    validate: {
      validator: (value: number) => Number.isFinite(value),
      message: 'price phải là một số hợp lệ',
    },
  })
  price: number;

  @Prop({
    type: Number,
    required: true,
    min: [1, 'Thời lượng dịch vụ tối thiểu là 1 phút'],
    max: [600, 'Thời lượng dịch vụ không được vượt quá 600 phút (10 tiếng)'],
    validate: {
      validator: Number.isInteger,
      message: 'duration phải là số nguyên (phút)',
    },
  })
  duration: number;
  @Prop({
    type: Boolean,
    required: true,
    default: true,
  })
  is_active: boolean;
}

export type ServiceDocument = Service & Document;
export const ServiceSchema = SchemaFactory.createForClass(Service);
ServiceSchema.index({ clinic_id: 1, name: 1 }, { unique: true });
