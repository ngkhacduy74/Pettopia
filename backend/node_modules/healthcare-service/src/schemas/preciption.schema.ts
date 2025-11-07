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
export class Medication {
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
    index: true,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'medical_record_id phải là UUIDv4 hợp lệ',
    ],
  })
  medical_record_id: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: [2, 'Tên thuốc phải có ít nhất 2 ký tự'],
    maxlength: [200, 'Tên thuốc không được vượt quá 200 ký tự'],
  })
  medication_name: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'Liều lượng không được để trống'],
    maxlength: [100, 'Liều lượng không được vượt quá 100 ký tự'],
  })
  dosage: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: [5, 'Hướng dẫn sử dụng phải có ít nhất 5 ký tự'],
    maxlength: [500, 'Hướng dẫn sử dụng không được vượt quá 500 ký tự'],
  })
  instructions: string;
}

export type MedicationDocument = Medication & Document;
export const MedicationSchema = SchemaFactory.createForClass(Medication);
