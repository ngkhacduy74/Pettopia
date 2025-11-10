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
export class MedicalRecord {
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
    unique: true,
    trim: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'appointment_id phải là UUIDv4 hợp lệ',
    ],
  })
  appointment_id: string;

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
      'clinic_id phải là UUIDv4 hợp lệ',
    ],
  })
  clinic_id: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: [5, 'symptoms phải có ít nhất 5 ký tự'],
    maxlength: [2000, 'symptoms không được vượt quá 2000 ký tự'],
  })
  symptoms: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: [5, 'diagnosis phải có ít nhất 5 ký tự'],
    maxlength: [2000, 'diagnosis không được vượt quá 2000 ký tự'],
  })
  diagnosis: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: [2000, 'notes không được vượt quá 2000 ký tự'],
  })
  notes?: string;
}

export type MedicalRecordDocument = MedicalRecord & Document;
export const MedicalRecordSchema = SchemaFactory.createForClass(MedicalRecord);
