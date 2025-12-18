import { IsOptional, IsString, IsArray, ArrayMaxSize, MaxLength, IsBoolean } from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  images?: string[];

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}
