import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
@Schema({ _id: false })
export class Address {
  @Prop({ type: String, required: true, trim: true }) city: string;
  @Prop({ type: String, required: true, trim: true }) district: string;
  @Prop({ type: String, required: true, trim: true }) ward: string;
  @Prop({ type: String, required: false, trim: true }) description?: string;
}
export const AddressSchema = SchemaFactory.createForClass(Address);
@Schema({ versionKey: false })
export class Identification {
  @Prop({ type: String, required: true, unique: true })
  identification_id: string;

  @Prop({ type: String, required: false })
  pet_id: string;

  @Prop({ type: String, required: true })
  fullname: string;

  @Prop({ type: Date, required: true })
  date_of_birth: Date;

  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @Prop({ type: String, required: true })
  gender: string;

  @Prop({ type: String, required: true })
  species: string;

  @Prop({ type: String, required: true })
  color: string;

  @Prop({ type: String, required: true })
  avatar_url: string;
}
export type IdentificationDocument = Identification & Document;
export const IdentificationSchema =
  SchemaFactory.createForClass(Identification);
