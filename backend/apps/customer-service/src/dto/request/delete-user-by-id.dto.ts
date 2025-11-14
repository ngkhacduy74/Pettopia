import { IsNotEmpty, IsUUID } from "class-validator";

export class DeleteUserByIdDto {
    @IsUUID()
    @IsNotEmpty()
    id: string;
  }