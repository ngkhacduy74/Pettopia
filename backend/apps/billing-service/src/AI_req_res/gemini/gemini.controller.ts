import { Controller, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ConversationService } from './conversation.service';
import { CreateChatCompletionRequest } from '../openai/dto/create-chat-completion.request';

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  }),
)
@Controller()
export class GeminiController {
  private readonly logger = new Logger(GeminiController.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly conversationService: ConversationService,
  ) { }

  @MessagePattern({ cmd: 'createGeminiChatCompletion' })
  async createChatCompletion(@Payload() body: CreateChatCompletionRequest) {
    try {
      return await this.geminiService.createChatCompletion(body);
    } catch (error) {
      this.logger.error('Error handling createGeminiChatCompletion:', error);

      // Đảm bảo lỗi trả về đúng format RpcException để Gateway đọc được
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error?.message || 'Unknown error in AI Service',
        error: 'Internal Server Error',
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