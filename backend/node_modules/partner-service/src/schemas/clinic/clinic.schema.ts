import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  Address,
  AddressSchema,
  Email,
  EmailSchema,
  Phone,
  PhoneSchema,
  Representative,
} from './clinic-register.schema';

@Schema({ timestamps: true })
export class Clinic {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[a-f0-9\-]{36}$/, 'ID không hợp lệ (phải là UUID v4)'],
  })
  id: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: [3, 'Tên phòng khám phải có ít nhất 3 ký tự'],
    maxlength: [100, 'Tên phòng khám không được vượt quá 100 ký tự'],
    match: [/^[A-Za-zÀ-ỹ0-9\s'’().,-]+$/, 'Tên phòng khám không hợp lệ'],
  })
  clinic_name: string;

  @Prop({ type: EmailSchema, required: true })
  email: Email;

  @Prop({ type: PhoneSchema, required: true })
  phone: Phone;

  @Prop({
    type: String,
    required: true,
    trim: true,
    match: [
      /^([0-9]{10}|[0-9]{3,6}\/[A-Z]{2,6}(-[A-Z]{2,10})?)$/,
      'Số giấy phép không hợp lệ (phải là 10 số hoặc dạng 123/HNY-SNNPTNT)',
    ],
  })
  license_number: string;

  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @Prop({
    type: String,
    trim: true,
    maxlength: [500, 'Mô tả không được vượt quá 500 ký tự'],
  })
  description?: string;

  @Prop({
    type: String,
    trim: true,
    // match: [
    //   /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i,
    //   'URL logo không hợp lệ',
    // ],
  })
  logo_url?: string;

  @Prop({
    type: String,
    trim: true,
    match: [/^https?:\/\/[^\s/$.?#].[^\s]*$/i, 'Địa chỉ website không hợp lệ'],
  })
  website?: string;

  @Prop({ type: Representative, required: true })
  representative: Representative;

  @Prop({ type: Boolean, default: false })
  is_active: boolean;

  @Prop({ type: [String], default: [] })
  member_ids: string[];

  @Prop({
    type: String,
    required: false,
    unique: true,
    trim: true,

    match: [/^[a-f0-9\-]{36}$/, 'ID người dùng không hợp lệ (phải là UUID v4)'],
  })
  user_account_id?: string;
}

export type ClinicDocument = Clinic & Document;
export const ClinicSchema = SchemaFactory.createForClass(Clinic);
