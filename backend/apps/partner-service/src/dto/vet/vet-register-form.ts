import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
  IsOptional,
  IsMobilePhone,
  Matches,
  IsEnum,
  ValidateNested,
  IsNumber,
  Min,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SocialLinkDto {
  @IsOptional()
  @IsUrl({}, { message: 'URL Facebook không hợp lệ.' })
  facebook?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL LinkedIn không hợp lệ.' })
  linkedin?: string;
}

export class CertificationDto {
  @IsString({ message: 'Tên chứng chỉ phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tên chứng chỉ không được để trống.' })
  name: string;

  @IsOptional()
  @IsUrl({}, { message: 'Link chứng chỉ không hợp lệ.' })
  link?: string;
}

export class VetRegisterDto {
  @IsString({ message: 'Chuyên ngành phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Chuyên ngành không được để trống.' })
  @Matches(/^[A-Za-zÀ-ỹ\s]+$/, { message: 'Chuyên ngành không hợp lệ' })
  specialty: string;

  @IsOptional()
  @IsArray({ message: 'Chuyên ngành phụ phải là mảng chuỗi.' })
  @IsString({
    each: true,
    message: 'Mỗi chuyên ngành phụ phải là một chuỗi ký tự.',
  })
  subSpecialties?: string[];

  @IsNumber({}, { message: 'Kinh nghiệm phải là một số.' })
  @Min(0, { message: 'Kinh nghiệm không được là số âm.' })
  @Type(() => Number) // Bắt buộc phải có để chuyển từ string trong payload thành number
  exp: number;

  @IsOptional()
  @IsString({ message: 'Tiểu sử phải là chuỗi ký tự.' })
  bio?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinkDto)
  social_link?: SocialLinkDto;

  @IsOptional()
  @IsArray({ message: 'Chứng chỉ phải là một mảng.' })
  @ValidateNested({ each: true })
  @ArrayMinSize(0) // Cho phép mảng rỗng
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @IsOptional()
  @IsArray({ message: 'ID phòng khám phải là mảng chuỗi.' })
  @IsString({
    each: true,
    message: 'Mỗi ID phòng khám phải là một chuỗi ký tự.',
  })
  clinic_id?: string[];

  @IsString({ message: 'Số giấy phép hành nghề phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Số giấy phép hành nghề không được để trống.' })
  license_number: string;

  @IsOptional()
  @IsUrl({}, { message: 'Đường dẫn ảnh giấy phép hành nghề không hợp lệ.' })
  license_image_url?: string;
}
