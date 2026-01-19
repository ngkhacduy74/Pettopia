import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ _id: false })
export class Address {
  @Prop({ type: String, required: true, trim: true }) city: string;
  @Prop({ type: String, required: true, trim: true }) district: string;
  @Prop({ type: String, required: true, trim: true }) ward: string;
  @Prop({ type: String, required: true, trim: true }) detail: string;
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

export class Representative {
  @Prop({
    type: String,
    required: [true, 'Tên người đại diện là bắt buộc'],
    trim: true,
    match: [
      /^[A-Za-zÀ-ỹ\s]+$/,
      'Tên không hợp lệ (chỉ chứa chữ và khoảng trắng)',
    ],
  })
  name: string;

  @Prop({ type: EmailSchema, required: true })
  email: Email;

  @Prop({ type: PhoneSchema, required: true })
  phone: Phone;

  @Prop({
    type: String,
    required: [true, 'CCCD/CMND là bắt buộc'],
    trim: true,
    match: [/^[0-9]{9,12}$/, 'CCCD/CMND không hợp lệ (9–12 chữ số)'],
  })
  identify_number: string;

  @Prop({
    type: String,
    trim: true,
    required: false,
  })
  avatar_url?: string;

  @Prop({
    type: [String],
    required: [true, 'Cần cung cấp ít nhất một giấy phép hành nghề'],
    validate: {
      validator: (v: string[]) => Array.isArray(v) && v.length > 0,
      message: 'Phải có ít nhất một giấy phép hành nghề',
    },
  })
  responsible_licenses: string[];

  @Prop({
    type: Date,
    required: false,
    validate: {
      validator: (v: Date) => !v || v <= new Date(),
      message: 'Ngày cấp phép không được lớn hơn ngày hiện tại',
    },
  })
  license_issued_date?: Date;
}

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
    default: () => uuidv4(),
    trim: true,
  })
  id: string;

  @Prop({ type: String, required: false, trim: true })
  user_id?: string;

  @Prop({ type: String, required: true, trim: true })
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

  @Prop({ type: Representative, required: true })
  representative: Representative;

  @Prop({ type: String, trim: true })
  note?: string;

  @Prop({
    type: String,
    required: false,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'review_by phải là UUIDv4 hợp lệ',
    ],
  })
  review_by?: string;

  @Prop({ type: String, trim: true })
  verification_token?: string;

  @Prop({ type: Date })
  token_expires_at?: Date;
}

function transformValue(doc: any, ret: any) {
  delete ret._id;
  delete ret.__v;
  return ret;
}

export type ClinicRegisterDocument = Clinic_Register & Document;
export const ClinicRegisterSchema =
  SchemaFactory.createForClass(Clinic_Register);
