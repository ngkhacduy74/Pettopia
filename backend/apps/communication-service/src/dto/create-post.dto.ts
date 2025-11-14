import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsString()
  user_id: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}