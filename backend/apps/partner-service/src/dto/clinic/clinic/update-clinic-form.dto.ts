import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
  IsEmail,
  IsBoolean,
  Matches,
} from 'class-validator';

class AddressDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsNotEmpty()
  ward: string;

  @IsString()
  @IsNotEmpty()
  detail: string;
}

class PhoneDto {
  @IsString()
  @Matches(/^(?:\+84|0)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phone_number: string;

  @IsBoolean()
  @IsOptional()
  verified?: boolean;
}

class EmailDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email_address: string;

  @IsBoolean()
  @IsOptional()
  verified?: boolean;
}

export class UpdateClinicFormDto {
  @IsOptional()
  @IsString()
  clinic_name?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @ValidateNested()
  @Type(() => PhoneDto)
  @IsOptional()
  phone?: PhoneDto;

  @ValidateNested()
  @Type(() => EmailDto)
  @IsOptional()
  email?: EmailDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  verification_token?: string;

  @IsOptional()
  @IsString()
  token_expires_at?: Date;
}
