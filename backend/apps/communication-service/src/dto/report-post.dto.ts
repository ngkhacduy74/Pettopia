import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReportPostDto {
  @IsNotEmpty({ message: 'Lý do không được để trống' })
  @IsString({ message: 'Lý do phải là chuỗi' })
  @MaxLength(500, { message: 'Lý do không được vượt quá 500 ký tự' })
  reason: string;
}