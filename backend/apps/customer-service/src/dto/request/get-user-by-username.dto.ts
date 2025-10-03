import { IsString } from 'class-validator';
export class GetUserByUsernameDto {
    @IsString()
    username: string;
  }