import { IsPhoneNumber } from 'class-validator';

export class CheckPhoneExistDto {
  @IsPhoneNumber('VN') 
  phone_number: string;
}