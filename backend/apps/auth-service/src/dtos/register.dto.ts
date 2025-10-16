// register.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsBoolean,
  IsDate,
  IsUrl,
  MinLength,
  MaxLength,
  IsOptional,
  IsMobilePhone,
  Matches,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}
export class RegisterDto {
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống.' })
  @MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự.' })
  fullname: string;

  @IsEnum(Gender, {
    message: 'Giới tính không hợp lệ. Phải là MALE, FEMALE, hoặc OTHER.',
  })
  @IsNotEmpty({ message: 'Giới tính không được để trống.' })
  gender: Gender;

  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự.' })
  email_address: string;

  @IsMobilePhone('vi-VN', {}, { message: 'Số điện thoại không hợp lệ.' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống.' })
  phone_number: string;

  @IsNotEmpty({ message: 'Tên người dùng không được để trống.' })
  @MinLength(4, { message: 'Tên người dùng phải có ít nhất 4 ký tự.' })
  @MaxLength(30, { message: 'Tên người dùng không được vượt quá 30 ký tự.' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Tên người dùng chỉ được chứa chữ cái, số và gạch dưới.',
  })
  username: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).{8,}$/, {
    message:
      'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số, kí tự đặc biệt và **không được chứa khoảng trắng**.',
  })
  password: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL ảnh đại diện không hợp lệ.' })
  @MaxLength(2048, { message: 'URL quá dài.' })
  avatar_url?: string;

  //   @IsNotEmpty({ message: 'Ngày sinh không được để trống.' })
  //   @IsDate({ message: 'Ngày sinh phải là định dạng ngày tháng hợp lệ.' })
  //   @Type(() => Date)
  dob: Date;
}
