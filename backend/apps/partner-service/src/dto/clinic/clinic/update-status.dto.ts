import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { RegisterStatus } from 'src/schemas/clinic/clinic-register.schema';

export class UpdateStatusClinicDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEnum(RegisterStatus, { message: 'Trạng thái không hợp lệ' })
  @IsNotEmpty()
  status: RegisterStatus;

  @IsString()
  note?: string;

  @IsString()
  @IsUUID('4')
  review_by: string;
}
