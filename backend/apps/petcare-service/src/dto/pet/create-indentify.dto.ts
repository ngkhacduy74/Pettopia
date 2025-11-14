import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  IsNotEmpty,
  IsString,
  IsIn,
  ValidateNested,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

@Schema({ _id: false })
export class Address {
  @Prop({ type: String, required: true, trim: true })
  @IsString()
  @IsNotEmpty({ message: 'City of Identify is not empty' })
  city: string;

  @Prop({ type: String, required: true, trim: true })
  @IsString()
  @IsNotEmpty({ message: 'District of Identify is not empty' })
  district: string;

  @Prop({ type: String, required: true, trim: true })
  @IsString()
  @IsNotEmpty({ message: 'Ward of Identify is not empty' })
  ward: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

export class CreateIdentificationDto {
  @IsString()
  @IsNotEmpty({ message: 'Name of Identify is not empty' })
  fullname: string;

  @IsString()
  @IsNotEmpty({ message: 'Species of Identify is not empty' })
  species: string;

  @IsString()
  @IsIn(['Male', 'Female'], {
    message: 'Gender must be either Male or Female',
  })
  @IsNotEmpty({ message: 'Gender of Identify is not empty' })
  gender: string;

  @IsString()
  @IsNotEmpty({ message: 'Avatar of Identify is not empty' })
  avatar_url: string | undefined;

  @Type(() => Date)
  @IsDate({ message: 'Date of birth must be a valid date (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Dob of Identify is not empty' })
  date_of_birth: Date;

  @ValidateNested()
  @Type(() => Address)
  @IsNotEmpty({ message: 'Address of Identify is not empty' })
  address: Address;

  @IsString()
  @IsNotEmpty({ message: 'Color of Identify is not empty' })
  color: string;
}
