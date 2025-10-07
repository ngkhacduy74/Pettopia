import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { Gender } from '../../schemas/pet.schema';

export class GetAllPetsDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'Species must be a string' })
  species?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Gender must be either Male or Female' })
  gender?: Gender;

  @IsOptional()
  @IsString({ message: 'Sort field must be a string' })
  sort_field?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'Sort order must be either asc or desc' })
  sort_order?: 'asc' | 'desc';
}
