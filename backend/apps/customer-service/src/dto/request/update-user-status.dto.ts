import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export enum UserStatus {
  ACTIVE = 'active',
  DEACTIVE = 'deactive',
}

export class UpdateUserStatusDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;
  @IsEnum(UserStatus, {
    message: 'status must be either active or deactive',
  })
  status: UserStatus;
}
