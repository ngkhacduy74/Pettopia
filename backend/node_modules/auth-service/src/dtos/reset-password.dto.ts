import { IsEmail, IsString, MinLength, IsNotEmpty, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  otp: string;

 @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
   @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
   @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự.' })
   @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).{8,}$/, {
     message:
       'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số, kí tự đặc biệt và **không được chứa khoảng trắng**.',
   })
   newPassword: string;
}