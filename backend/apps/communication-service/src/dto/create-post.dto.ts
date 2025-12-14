import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}