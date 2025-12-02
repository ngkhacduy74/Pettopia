import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
  IsOptional,
  IsMobilePhone,
  Matches,
  IsEnum,
  ValidateNested, // Dùng cho validation lồng nhau
} from 'class-validator';
import { Type } from 'class-transformer'; // Dùng cho validation lồng nhau và Date

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export class AddressDto {
  @IsString({ message: 'Thành phố phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Thành phố không được để trống.' })
  city: string;

  @IsString({ message: 'Quận/Huyện phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Quận/Huyện không được để trống.' })
  district: string;

  @IsString({ message: 'Phường/Xã phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Phường/Xã không được để trống.' })
  ward: string;

  @IsString({ message: 'Mô tả địa chỉ phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mô tả địa chỉ không được để trống.' })
  description: string;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsString({ message: 'Ngày sinh phải được gửi dưới dạng chuỗi hợp lệ.' })
  @IsNotEmpty({ message: 'Ngày sinh không được để trống.' })
  @Type(() => Date)
  dob: Date;
}
