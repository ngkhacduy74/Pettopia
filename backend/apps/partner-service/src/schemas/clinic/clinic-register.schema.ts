import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as uuid from 'uuid';
@Schema({ _id: false })
export class Address {
  @Prop({ type: String, required: true, trim: true }) city: string;
  @Prop({ type: String, required: true, trim: true }) district: string;
  @Prop({ type: String, required: true, trim: true }) ward: string;
  @Prop({ type: String, required: true, trim: true }) street: string;
}
export const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({ _id: false })
export class Email {
  @Prop({
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
      'Email không hợp lệ',
    ],
  })
  email_address: string;

  @Prop({ type: Boolean, default: false })
  verified: boolean;
}
export const EmailSchema = SchemaFactory.createForClass(Email);

@Schema({ _id: false })
export class Phone {
  @Prop({
    type: String,
    required: true,
    trim: true,
    match: [
      /^(?:\+84|0)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/,
      'Số điện thoại không hợp lệ (chỉ chấp nhận số Việt Nam)',
    ],
  })
  phone_number: string;

  @Prop({ type: Boolean, default: false })
  verified: boolean;
}
export const PhoneSchema = SchemaFactory.createForClass(Phone);

export enum RegisterStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({
  timestamps: true,
  toJSON: { transform: transformValue },
  toObject: { transform: transformValue },
})
export class Clinic_Register {
  @Prop({
    type: String,
    required: [true, 'Clinic ID is required'],
    unique: true,
    default: () => uuid.v4(),
    trim: true,
  })
  id: string;

  @Prop({ type: String, required: true, trim: true })
  clinic_name: string;

  @Prop({ type: EmailSchema, required: true })
  email: Email;

  @Prop({ type: PhoneSchema, required: true })
  phone: Phone;

  @Prop({ type: String, required: true, trim: true })
  license_number: string;

  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @Prop({ type: Number, min: 1900, max: new Date().getFullYear() })
  established_year: number;

  @Prop({ type: String, trim: true })
  description: string;

  @Prop({ type: String, trim: true })
  logo_url: string;

  @Prop({ type: String, trim: true })
  website?: string;

  @Prop({
    type: String,
    enum: RegisterStatus,
    default: RegisterStatus.PENDING,
  })
  status: RegisterStatus;

  @Prop({ type: String, trim: true })
  note?: string;
}

function transformValue(doc: any, ret: any) {
  delete ret._id;
  delete ret.__v;
  return ret;
}

export type ClinicRegisterDocument = Clinic_Register & Document;
export const ClinicRegisterSchema =
  SchemaFactory.createForClass(Clinic_Register);
