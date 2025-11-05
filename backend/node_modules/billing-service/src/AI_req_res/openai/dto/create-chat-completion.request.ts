import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

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
}

export class ChatCompletionMessageDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}


