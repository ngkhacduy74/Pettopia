import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as uuid from 'uuid';

// Tái sử dụng các Schema con (Sub-Schemas)
// (Bạn cần import các Schema con này từ file gốc nếu chúng nằm ở file khác,
// nhưng tôi định nghĩa lại ở đây để đảm bảo tính độc lập của file Schema)

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

@Schema({
  timestamps: true,
  toJSON: { transform: transformValue },
  toObject: { transform: transformValue },
})
export class Vet {
  @Prop({
    type: String,
    required: [true, 'Vet ID is required'],
    unique: true,
    default: () => uuid.v4(),
    trim: true,
  })
  id: string;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({
    type: String,
    trim: true,
    required: true,
    match: [/^[A-Za-zÀ-ỹ\s]+$/, 'Chuyên ngành không hợp lệ'],
  })
  specialty: string;

  @Prop({ type: [String], default: [] })
  subSpecialties: string[];

  @Prop({ type: Number, required: true, min: 0 })
  exp: number;

  @Prop({ type: String, trim: true })
  bio: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
  })
  license_number: string;

  @Prop({
    type: String,
    trim: true,
    match: [
      /^https?:\/\/.+/i,
      'Đường dẫn ảnh giấy phép hành nghề không hợp lệ',
    ],
  })
  license_image_url?: string;

  @Prop({ type: SocialLinkSchema })
  social_link?: SocialLink;

  @Prop({ type: [CertificationSchema], default: [] })
  certifications?: Certification[];

  @Prop({ type: [String], default: [] })
  clinic_id?: string[];
}

function transformValue(doc: any, ret: any) {
  delete ret._id;
  delete ret.__v;
  return ret;
}

export type VetDocument = Vet & Document;
export const VetSchema = SchemaFactory.createForClass(Vet);
