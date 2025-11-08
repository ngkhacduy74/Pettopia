import { IsOptional, IsString, IsArray, ArrayMaxSize, MaxLength } from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  tags?: string[];

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  isHidden?: boolean;
}
