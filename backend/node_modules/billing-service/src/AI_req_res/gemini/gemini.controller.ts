import { Body, Controller, Post } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { CreateChatCompletionRequest } from '../openai/dto/create-chat-completion.request';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('chat')
  async createChatCompletion(@Body() body: CreateChatCompletionRequest) {
    return this.geminiService.createChatCompletion(body.messages);
  }
}


