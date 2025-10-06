import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum Gender {
  Male = 'Male',
  Female = 'Female',
}

@Schema({
  timestamps: true,
  toJSON: { transform: transformValue },
  toObject: { transform: transformValue },
})
export class Pet {
  @Prop({
    type: String,
    required: [true, 'Pet ID is required'],
    unique: true,
    default: uuidv4,
    trim: true,
  })
  pet_id: string;

  @Prop({ 
    type: String, 
    required: [true, 'Name is required'], 
    trim: true 
  })
  name: string;

  @Prop({ 
    type: String, 
    required: [true, 'Species is required'], 
    trim: true 
  })
  species: string;

  @Prop({
    type: String,
    enum: Gender,
    required: [true, 'Gender is required'],
  })
  gender: Gender;

  @Prop({
    type: Number,
    required: [true, 'Age is required'],
    min: [0, 'Age must be positive'],
  })
  age: number;

  @Prop({ 
    type: String, 
    required: [true, 'Color is required'], 
    trim: true 
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

  @Prop({
    type: String,
    required: [true, 'User ID is required'],
    trim: true,
  })
  userId: string;
}

function transformValue(doc: any, ref: { [key: string]: any }) {
  delete ref._id;
  delete ref.__v;
  return ref;
}

export type PetDocument = Pet & Document;
export const PetSchema = SchemaFactory.createForClass(Pet);
