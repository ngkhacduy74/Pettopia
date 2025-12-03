import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class GetUserByIdDto {
    @IsString()
    @IsNotEmpty()
    id: string;
    @IsString()
    @IsOptional()
    role?:string
  }