import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as uuid from 'uuid';
@Schema({ _id: false })
export class Address {
  @Prop({ type: String, required: true, trim: true }) city: string;
  @Prop({ type: String, required: true, trim: true }) district: string;
  @Prop({ type: String, required: true, trim: true }) ward: string;
  @Prop({ type: String, required: false, trim: true }) description?: string;
}
export const AddressSchema = SchemaFactory.createForClass(Address);
export enum UserRole {
  ADMIN = 'Admin',
  STAFF = 'Staff',
  USER ="User",
  VET ='Vet',
  Clinic='Clinic'
}
@Schema({ _id: false })
export class Email {
  @Prop({
    type: String,
    required: true,
    lowercase: true,
    match: [/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Email is invalid'],
  })
  email_address: string;
  @Prop({ type: Boolean, default: false }) verified: boolean;
}
export const EmailSchema = SchemaFactory.createForClass(Email);

@Schema({ _id: false })
export class Phone {
  @Prop({ required: true }) phone_number: string;
  @Prop({ default: false }) verified: boolean;
}
export const PhoneSchema = SchemaFactory.createForClass(Phone);

@Schema({ _id: false })
export class AuditLogs {
  @Prop({ type: [{ type: Date }] })
  change_password_time?: Date[];

  @Prop({ type: [{ type: Date }] })
  change_email_time?: Date[];

  @Prop({ type: Date })
  delete_time?: Date;
}
export const AuditLogsSchema = SchemaFactory.createForClass(AuditLogs);



@Schema({
  timestamps: true,
  toJSON: { transform: transformValue },
  toObject: { transform: transformValue },
})
export class User {
  @Prop({
    type: String,
    required: [true, 'User ID is required'],
    unique: true,
    default: () => uuid.v4(),
    trim: true,
  })
  id: string;
  @Prop({type:String, required:false})
  clinic_id?:string;
  @Prop({ type: String, required: false, trim: true })
  fullname: string;

  @Prop({ type: EmailSchema })
  email: Email;

  @Prop({
    type: PhoneSchema,
    required: true,
    match: [
      /^(0|\+84)\d{9}$/,
      'Số điện thoại phải đúng định dạng của Việt Nam',
    ],
  })
  phone: Phone;

  @Prop({
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
  })
  username: string;

  @Prop({
    select: false,
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Mật khẩu phải có ít nhất 8 ký tự'],
    match: [
      /^(?=.*[0-9])(?=.*[!@#$%^&*])/,
      'Mật khẩu phải chứa ít nhất 1 số và 1 ký tự đặc biệt (!@#$%^&*)',
    ],
  })
  password: string;

  @Prop({
    type: [String], 
    default: UserRole.USER,
  })
  role: string[];

  @Prop()
  bio?: string;

  @Prop({ type: AddressSchema })
  address: Address;

  

  @Prop({ type: Number, default: 0, min: [0, 'Reward point must be positive'] })
  reward_point: number;

  @Prop({
    type: Date,
    required: false,
  })
  dob?: Date;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ type: Boolean, default: false })
  is_vip: boolean;

  @Prop({
    type: Date,
    required: false,
  })
  vip_expires_at?: Date;

  @Prop({ type: AuditLogsSchema })
  audit_logs?: AuditLogs;
}
const SALT_ROUNDS = 10;
function transformValue(doc: any, ref: { [key: string]: any }) {
  delete ref._id;
  delete ref.__v;
  return ref;
}
export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
