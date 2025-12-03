import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  IsBoolean,
  IsDate,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';

class EmailDto {
  @IsEmail()
  email_address: string;

  @IsBoolean()
  @IsOptional()
  verified?: boolean;
}

class PhoneDto {
  @IsPhoneNumber('VN')
  phone_number: string;

  @IsBoolean()
  @IsOptional()
  verified?: boolean;
}

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
  @IsOptional()
  description?: string;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống.' })
  fullname: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsNotEmpty({ message: 'Username không được để trống.' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  password: string;

  @IsDate()
  @IsOptional()
  dob?: Date;

  @IsString()
  @IsOptional()
  avatar_url?: string;

  @ValidateNested()
  @Type(() => EmailDto)
  email: EmailDto;

  @ValidateNested()
  @Type(() => PhoneDto)
  phone: PhoneDto;
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;
}
