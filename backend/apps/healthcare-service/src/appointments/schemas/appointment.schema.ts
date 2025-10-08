import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

export enum AppointmentStatus {
  Pending = 'Pending',
  Confirm = 'Confirm',
  Cancel = 'Cancel',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Appointment {
  @Prop({ required: true })
  appointment_id: string;

  @Prop({ required: true })
  pet_id: string;

  @Prop({ required: true })
  owner_id: string;

  @Prop({ required: true })
  clinic_id: string;

  @Prop({ required: true })
  veterinarian_id: string;

  @Prop({ required: true })
  service_id: string;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ enum: AppointmentStatus, default: AppointmentStatus.Pending })
  status: AppointmentStatus;

  @Prop({ type: Date, default: null })
  checkin_time: Date;

  @Prop({ type: Date, default: null })
  checkout_time: Date;

  @Prop({ type: String, default: '' })
  notes: string;

  @Prop({ type: Boolean, default: false })
  feedback_status: boolean;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
