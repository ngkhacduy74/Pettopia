import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested, IsUUID } from 'class-validator';

export class CreateChatCompletionRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatCompletionMessageDto)
  messages: ChatCompletionMessageDto[];

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsUUID('4')
  @IsOptional()
  clinicId?: string;

  @IsString()
  @IsOptional()
  vetId?: string;

  @IsOptional()
  role?: string | string[]; 
}

export class ChatCompletionMessageDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}


