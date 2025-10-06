import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  IsBoolean,
  IsDate,
} from 'class-validator';

class EmailDto {
  @IsEmail()
  email_address: string;

  @IsBoolean()
  verified: boolean;
}

class PhoneDto {
  @IsPhoneNumber('VN')
  phone_number: string;

  @IsBoolean()
  verified: boolean;
}

export class CreateUserDto {
  @IsString()
  fullname: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsDate()
  @IsOptional()
  dob?: Date;

  @IsString()
  @IsOptional()
  avatar_url?: string;

  email: EmailDto;
  phone: PhoneDto;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;

  @IsDate()
  @IsOptional()
  created_at?: Date = new Date();

  @IsDate()
  @IsOptional()
  updated_at?: Date = new Date();
}
