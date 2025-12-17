import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
@Schema({ _id: false })
export class Address {
  @Prop({ type: String })
  city: string;

  @Prop({ type: String })
  district: string;

  @Prop({ type: String })
  ward: string;
}
export const AddressSchema = SchemaFactory.createForClass(Address);
@Schema({ _id: false, versionKey: false })
export class Owner {
  @Prop({ type: String, required: true })
  user_id: string;

  @Prop({ type: String, required: true })
  fullname: string;

  @Prop({ type: String, required: true })
  phone: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: AddressSchema, required: false })
  address?: Address;
}
export const OwnerSchema = SchemaFactory.createForClass(Owner);

export enum Gender {
  Male = 'Male',
  Female = 'Female',
}

function transformValue(doc: any, ret: { [key: string]: any }) {
  delete ret._id;
  delete ret.__v;
  return ret;
}

export enum PetSource {
  USER = 'USER',
  CLINIC = 'CLINIC',
}

@Schema({
  timestamps: true,
  toJSON: { transform: transformValue },
  toObject: { transform: transformValue },
})
export class Pet {
  @Prop({ type: String, unique: true, default: () => uuidv4() })
  id: string;

  @Prop({
    type: String,
    enum: PetSource,
    default: PetSource.USER,
  })
  source: PetSource;

  @Prop({
    type: Boolean,
    default: true,
  })
  isClaimed: boolean;

  @Prop({
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  })
  name: string;

  @Prop({
    type: String,
    required: [true, 'Species is required'],
    trim: true,
  })
  species: string;

  @Prop({
    type: String,
    required: [true, 'Breed is required'],
    trim: true,
  })
  breed: string;

  @Prop({
    type: String,
    enum: Gender,
    required: [true, 'Gender is required'],
  })
  gender: Gender;

  @Prop({
    type: String,
    required: [true, 'Color is required'],
    trim: true,
  })
  color: string;

  @Prop({
    type: Number,
    required: [true, 'Weight is required'],
    min: [0, 'Weight must be positive'],
  })
  weight: number;

  @Prop({
    type: Date,
    required: [true, 'Date of birth is required'],
  })
  dateOfBirth: Date;

  @Prop({ type: OwnerSchema, required: true })
  owner: Owner;

  @Prop({ type: String, trim: true, required: true })
  avatar_url: string;

  @Prop({ type: [String], default: [] })
  medical_records?: string[];
  @Prop({ type: String })
  qr_code_url?: string;
}

export type PetDocument = Pet & Document;
export const PetSchema = SchemaFactory.createForClass(Pet);
