import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as uuid from 'uuid';

export enum VetRegisterStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ _id: false })
export class SocialLink {
  @Prop({ type: String, trim: true })
  facebook?: string;

  @Prop({ type: String, trim: true })
  linkedin?: string;
}
export const SocialLinkSchema = SchemaFactory.createForClass(SocialLink);

@Schema({ _id: false })
export class Certification {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/i, 'Link chứng chỉ không hợp lệ'],
  })
  link?: string;
}
export const CertificationSchema = SchemaFactory.createForClass(Certification);

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

@Schema({
  timestamps: true,
  toJSON: { transform: transformValue },
  toObject: { transform: transformValue },
})
export class Vet_Register {
  // ID của bản đăng ký
  @Prop({
    type: String,
    required: [true, 'Vet Register ID is required'],
    unique: true,
    default: () => uuid.v4(),
    trim: true,
  })
  id: string;

  // Nếu vet này đăng ký từ user đã có tài khoản
  @Prop({ type: String, required: true, trim: true })
  user_id: string;

  @Prop({
    type: String,
    trim: true,
    match: [/^[A-Za-zÀ-ỹ\s]+$/, 'Chuyên ngành không hợp lệ'],
  })
  specialty: string;

  @Prop({ type: [String], default: [] })
  subSpecialties: string[];

  @Prop({ type: Number, required: true, min: 0 })
  exp: number;

  @Prop({ type: String, trim: true })
  bio: string;

  // Liên kết mạng xã hội
  @Prop({ type: SocialLinkSchema })
  social_link?: SocialLink;

  // Danh sách chứng chỉ
  @Prop({ type: [CertificationSchema], default: [] })
  certifications?: Certification[];

  // Thông tin phòng khám nếu có (có thể null)
  @Prop({ type: String, trim: true })
  clinic_id?: string;

  // Ngôn ngữ làm việc
  @Prop({ type: [String], enum: ['vi', 'en'], default: ['vi'] })
  languages: string[];

  // Giấy phép hành nghề
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  license_number: string;

  @Prop({
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/i, 'Đường dẫn ảnh chứng chỉ không hợp lệ'],
  })
  license_image_url?: string;

  // Trạng thái xét duyệt
  @Prop({
    type: String,
    enum: VetRegisterStatus,
    default: VetRegisterStatus.PENDING,
  })
  status: VetRegisterStatus;

  // Ghi chú từ staff khi duyệt
  @Prop({ type: String, trim: true })
  note?: string;

  @Prop({
    type: String,
    required: true,
    match: [
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      'review_by phải là UUIDv4 hợp lệ',
    ],
  })
  review_by: string;
}

function transformValue(doc: any, ret: any) {
  delete ret._id;
  delete ret.__v;
  return ret;
}

export type VetRegisterDocument = Vet_Register & Document;
export const VetRegisterSchema = SchemaFactory.createForClass(Vet_Register);
