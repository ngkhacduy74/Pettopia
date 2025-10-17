import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
export class SendEmailOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @IsString({ message: 'Email phải là chuỗi ký tự.' })
  email: string;
}
