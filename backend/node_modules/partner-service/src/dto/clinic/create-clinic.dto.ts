import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsMongoId,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
  IsOptional,
  IsBoolean,
  IsUrl,
} from 'class-validator';
import {
  Address,
  AddressSchema,
  Email,
  EmailSchema,
  Phone,
  PhoneSchema,
  Representative,
} from 'src/schemas/clinic/clinic-register.schema';
import { Prop } from '@nestjs/mongoose';

export class CreateClinicDto {
  @IsUUID('4', { message: 'ID không hợp lệ (phải là UUID v4)' })
  @IsNotEmpty({ message: 'ID không được để trống' })
  id: string;

  @IsMongoId({ message: 'creator_id không hợp lệ (phải là ObjectId)' })
  @IsNotEmpty({ message: 'creator_id không được để trống' })
  creator_id: string;

  @IsString()
  @MinLength(3, { message: 'Tên phòng khám phải có ít nhất 3 ký tự' })
  @MaxLength(100, { message: 'Tên phòng khám không được vượt quá 100 ký tự' })
  @Matches(/^[A-Za-zÀ-ỹ0-9\s'’().,-]+$/, {
    message: 'Tên phòng khám chứa ký tự không hợp lệ',
  })
  clinic_name: string;

  @ValidateNested()
  @Prop({ type: EmailSchema, required: true })
  email: Email;

  @ValidateNested()
  @Prop({ type: PhoneSchema, required: true })
  phone: Phone;

  @IsString()
  @IsNotEmpty({ message: 'Số giấy phép hành nghề không được để trống' })
  @Matches(/^[A-Z0-9\-]{6,20}$/, {
    message: 'Số giấy phép hành nghề không hợp lệ (6–20 ký tự, A-Z, 0-9, -)',
  })
  license_number: string;

  @ValidateNested()
  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Mô tả không được vượt quá 500 ký tự' })
  description?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL logo không hợp lệ' })
  logo_url?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Địa chỉ website không hợp lệ' })
  website?: string;

  @ValidateNested()
  @Prop({ type: Representative, required: true })
  representative: Representative;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái không hợp lệ (phải là true/false)' })
  is_active?: boolean;
}
