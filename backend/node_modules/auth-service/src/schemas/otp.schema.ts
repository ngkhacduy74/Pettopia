// src/schemas/otp.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpDocument = Otp & Document;

export enum OtpMethod {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: false },
})
export class Otp {
  @Prop({ required: true, index: true })
  target: string;

  @Prop({ required: true, index: true })
  code: string;

  @Prop({
    type: String,
    enum: Object.values(OtpMethod),
    required: true,
  })
  method: OtpMethod;

  @Prop({ type: Date, required: true })
  expires_at: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
