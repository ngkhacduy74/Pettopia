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
export class ClinicRating {
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
    index: true,
    trim: true,
  })
  appointment_id: string;

  @Prop({
    type: String,
    required: true,
    index: true,
    trim: true,
  })
  clinic_id: string;

  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  clinic_name?: string;

  @Prop({
    type: [String],
    required: false,
    default: [],
  })
  service_ids?: string[];

  @Prop({
    type: [String],
    required: false,
    default: [],
  })
  service_names?: string[];

  @Prop({
    type: String,
    required: true,
    index: true,
    trim: true,
  })
  user_id: string;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    max: 5,
  })
  stars: number;

  @Prop({
    type: String,
    required: false,
    trim: true,
    maxlength: 1000,
  })
  notes?: string;
}

export type ClinicRatingDocument = ClinicRating & Document;
export const ClinicRatingSchema = SchemaFactory.createForClass(ClinicRating);


