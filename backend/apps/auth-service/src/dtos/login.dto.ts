import { IsNotEmpty, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Tài khoản không được để trống' })
  username: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự.' })
  @Matches(/[A-Z]/, { message: 'Mật khẩu phải chứa ít nhất một chữ hoa.' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt.',
  })
  password: string;
}
