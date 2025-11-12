import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ClinicInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
}

export enum ClinicInvitationRole {
  VET = 'vet',
  STAFF = 'staff',
  RECEPTIONIST = 'receptionist',
  MANAGER = 'manager',
}

@Schema({ timestamps: true })
export class ClinicInvitation {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[a-f0-9\-]{36}$/, 'ID lời mời không hợp lệ (UUID v4).'],
  })
  id: string;

  @Prop({
    type: String,
    required: true,
    index: true,
    trim: true,
    match: [/^[a-f0-9\-]{36}$/, 'ID phòng khám không hợp lệ (UUID v4).'],
  })
  clinic_id: string;

  @Prop({
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email lời mời không hợp lệ.'],
  })
  invited_email: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ClinicInvitationRole),
  })
  role: ClinicInvitationRole;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[a-f0-9\-]{36}$/, 'Token lời mời không hợp lệ (UUID v4).'],
  })
  token: string;

  @Prop({
    type: Date,
    required: true,
  })
  expires_at: Date;

  @Prop({
    type: String,
    enum: Object.values(ClinicInvitationStatus),
    default: ClinicInvitationStatus.PENDING,
  })
  status: ClinicInvitationStatus;

  @Prop({
    type: String,
    trim: true,
    match: [/^[a-f0-9\-]{36}$/, 'ID người mời không hợp lệ (UUID v4).'],
  })
  invited_by?: string;

  @Prop({
    type: String,
    trim: true,
    match: [/^[a-f0-9\-]{36}$/, 'ID người xác nhận không hợp lệ (UUID v4).'],
  })
  accepted_by?: string;

  @Prop({ type: Date })
  accepted_at?: Date;

  @Prop({ type: Date })
  declined_at?: Date;
}

export type ClinicInvitationDocument = ClinicInvitation & Document;
export const ClinicInvitationSchema =
  SchemaFactory.createForClass(ClinicInvitation);

