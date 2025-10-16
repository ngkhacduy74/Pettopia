import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  IsBoolean,
  IsDate,
  Matches,
  IsArray,
  ArrayMinSize,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { RegisterStatus } from 'src/schemas/clinic/clinic-register.schema';

class EmailDto {
  @IsEmail()
  email_address: string;

  @IsOptional()
  @IsBoolean()
  verified: boolean = false;
}

class PhoneDto {
  @IsPhoneNumber('VN')
  phone_number: string;

  @IsOptional()
  @IsBoolean()
  verified: boolean = false;
}

class AddressDto {
  @IsString() city: string;
  @IsString() district: string;
  @IsString() ward: string;
  @IsString() detail: string;
}

class RepresentativeDto {
  @Matches(/^[A-Za-zÀ-ỹ\s]+$/, { message: 'Tên không hợp lệ' })
  name: string;

  @Matches(/^[0-9]{9,12}$/, { message: 'CCCD/CMND không hợp lệ' })
  identify_number: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 giấy phép hành nghề' })
  @IsString({ each: true })
  responsible_licenses: string[];

  @IsOptional()
  @IsDate({ message: 'Ngày cấp phép không hợp lệ' })
  license_issued_date?: Date;
}
export class CreateClinicFormDto {
  @IsString()
  user_id: string;

  @IsString()
  clinic_name: string;

  @ValidateNested()
  @Type(() => EmailDto)
  email: EmailDto;

  @ValidateNested()
  @Type(() => PhoneDto)
  phone: PhoneDto;

  @IsString()
  license_number: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

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
  @IsEnum(RegisterStatus)
  status?: RegisterStatus = RegisterStatus.PENDING;

  @ValidateNested()
  @Type(() => RepresentativeDto)
  representative: RepresentativeDto;

  @IsOptional()
  @IsString()
  note?: string;
}
