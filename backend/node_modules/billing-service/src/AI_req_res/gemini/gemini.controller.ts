import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GeminiService } from './gemini.service';
import { ConversationService } from './conversation.service';
import { CreateChatCompletionRequest } from '../openai/dto/create-chat-completion.request';

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller()
export class GeminiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly conversationService: ConversationService,
  ) {}

  @MessagePattern({ cmd: 'createGeminiChatCompletion' })
  async createChatCompletion(@Payload() body: CreateChatCompletionRequest) {
    return this.geminiService.createChatCompletion(body);
  }

  @MessagePattern({ cmd: 'getGeminiConversationHistory' })
  async getConversationHistory(@Payload() data: { conversationId: string; userId: string }) {
    return this.conversationService.getConversationHistory(
      data.conversationId,
      data.userId,
    );
  }

  @MessagePattern({ cmd: 'clearGeminiConversation' })
  async clearConversation(@Payload() data: { conversationId: string; userId: string }) {
    return this.conversationService.clearConversation(
      data.conversationId,
      data.userId,
    );
  }
}


