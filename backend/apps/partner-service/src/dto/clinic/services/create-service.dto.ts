import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsInt,
} from 'class-validator';

export class CreateServiceDto {
  @IsString({ message: 'Tên dịch vụ phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên dịch vụ không được để trống' })
  @MinLength(2, { message: 'Tên dịch vụ phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên dịch vụ không được vượt quá 100 ký tự' })
  readonly name: string;

  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MaxLength(1000, { message: 'Mô tả dịch vụ không được vượt quá 1000 ký tự' })
  @IsOptional()
  readonly description?: string;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'Giá dịch vụ phải là một số hợp lệ' },
  )
  @IsNotEmpty({ message: 'Giá dịch vụ không được để trống' })
  @Min(0, { message: 'Giá dịch vụ không được nhỏ hơn 0' })
  @Max(1_000_000_000, { message: 'Giá dịch vụ không được vượt quá 1 tỷ' })
  readonly price: number;

  @IsNumber({}, { message: 'Thời lượng phải là một số' })
  @IsNotEmpty({ message: 'Thời lượng không được để trống' })
  @IsInt({ message: 'Thời lượng phải là số nguyên (phút)' })
  @Min(1, { message: 'Thời lượng dịch vụ tối thiểu là 1 phút' })
  @Max(600, {
    message: 'Thời lượng dịch vụ không được vượt quá 600 phút (10 tiếng)',
  })
  readonly duration: number;
}
