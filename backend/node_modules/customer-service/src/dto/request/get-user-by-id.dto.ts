import { IsNotEmpty, IsString } from 'class-validator';
export class GetUserByIdDto {
    @IsString()
    @IsNotEmpty()
    id: string;
  }