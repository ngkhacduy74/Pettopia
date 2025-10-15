import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum VetInviteTokenStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
}

export type VetInviteTokenDocument = VetInviteToken & Document;

@Schema({ timestamps: true })
export class VetInviteToken {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({
    type: String,
    enum: Object.values(VetInviteTokenStatus),
    default: VetInviteTokenStatus.PENDING,
  })
  status: VetInviteTokenStatus;

  @Prop({ required: true })
  clinic_id: string;

  @Prop({ required: true })
  expires_at: Date;
}

export const VetInviteTokenSchema =
  SchemaFactory.createForClass(VetInviteToken);
