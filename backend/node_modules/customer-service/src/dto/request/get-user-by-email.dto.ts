import { IsEmail, IsString } from 'class-validator';
export class GetUserByEmailDto {
    @IsEmail()
    email_address: string;
  }