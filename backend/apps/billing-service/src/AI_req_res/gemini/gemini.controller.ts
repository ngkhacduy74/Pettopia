import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ConversationService } from './conversation.service';
import { CreateChatCompletionRequest } from '../openai/dto/create-chat-completion.request';

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false, // Cho phép các field không định nghĩa để tránh lỗi
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
    try {
      return await this.geminiService.createChatCompletion(body);
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }      

      console.error('Unexpected error in createChatCompletion:', error);

      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || 'Failed to create chat completion',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
      });
    }
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


