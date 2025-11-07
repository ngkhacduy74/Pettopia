import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SocialLinkDto {
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Facebook phải là một đường dẫn hợp lệ' })
  facebook?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'LinkedIn phải là một đường dẫn hợp lệ' })
  linkedin?: string;
}

export class CertificationDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên chứng chỉ không được để trống' })
  @MaxLength(255, { message: 'Tên chứng chỉ không vượt quá 255 ký tự' })
  name: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Link chứng chỉ phải là một đường dẫn hợp lệ' })
  link?: string;
}

export class CreateVetDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsString({ message: 'Chuyên ngành phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Chuyên ngành không được để trống' })
  @Matches(/^[A-Za-zÀ-ỹ\s]+$/, { message: 'Chuyên ngành không hợp lệ' })
  specialty: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subSpecialties?: string[];

  @IsInt({ message: 'Kinh nghiệm phải là số nguyên' })
  @IsPositive({ message: 'Kinh nghiệm phải là số dương' })
  exp: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsString()
  @IsNotEmpty({ message: 'Số giấy phép hành nghề không được để trống' })
  license_number: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Đường dẫn ảnh giấy phép hành nghề không hợp lệ' })
  license_image_url?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinkDto)
  social_link?: SocialLinkDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clinic_id?: string[];
}
