import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as uuid from 'uuid';
import type { PaymentStatus } from '../types/dto';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({
    type: String,
    required: true,
    unique: true,
    default: () => uuid.v4(),
    trim: true,
  })
  id: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: Number, required: true, unique: true, index: true })
  orderCode: number;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, default: 'VND' })
  currency: string;

  @Prop({ type: String, default: 'payos' })
  provider: string;

  @Prop({
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'canceled'],
    default: 'pending',
    index: true,
  })
  status: PaymentStatus;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, required: false })
  paymentUrl?: string;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  paidAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ orderCode: 1 });
