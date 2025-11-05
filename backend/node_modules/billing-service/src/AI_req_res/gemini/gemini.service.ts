import { HttpException, HttpStatus, Injectable, Inject } from '@nestjs/common';
import { GenerativeModel } from '@google/generative-ai';
import { ChatCompletionMessageDto, CreateChatCompletionRequest } from '../openai/dto/create-chat-completion.request';
import { ConversationService } from './conversation.service';

@Injectable()
export class GeminiService {
  constructor(
    @Inject('GEMINI_MODEL') private readonly model: GenerativeModel,
    private readonly conversationService: ConversationService,
  ) {}

  async createChatCompletion(request: CreateChatCompletionRequest) {
    try {
      let { messages, userId, conversationId } = request;

  
      let allMessages: ChatCompletionMessageDto[] = [];
      if (conversationId) {
        const history = await this.conversationService.getConversationHistory(
          conversationId,
          userId,
        );
        allMessages = [...history];
      } else {
    
        const latest = await this.conversationService.getLatestConversation(userId);
        if (latest) {
          conversationId = latest.conversationId;
          const history = await this.conversationService.getConversationHistory(
            latest.conversationId,
            userId,
          );
          allMessages = [...history];
        }
      }

      // Append all incoming messages to the reconstructed history (preserve order)
      if (Array.isArray(messages) && messages.length > 0) {
        for (const m of messages) {
          allMessages.push(m);
        }
      }


      const contents = allMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const result = await this.model.generateContent({ contents });
      const response = result.response;

      const assistantResponse: ChatCompletionMessageDto = {
        role: 'assistant',
        content: response.text(),
      };

    
      const conversation = await this.conversationService.getOrCreateConversation(
        userId,
        conversationId,
      );

      // Persist all user messages from this turn
      if (Array.isArray(messages) && messages.length > 0) {
        for (const m of messages) {
          if (m.role === 'user') {
            await this.conversationService.addMessage(
              conversation.conversationId,
              userId,
              m,
            );
          }
        }
      }

     
      await this.conversationService.addMessage(
        conversation.conversationId,
        userId,
        assistantResponse,
      );

      return {
        conversationId: conversation.conversationId,
        role: 'assistant',
        content: response.text(),
        candidates: response.candidates,
        usageMetadata: response.usageMetadata,
      };
    } catch (err: any) {
      const statusFromSdk: number | undefined = err?.status;
      const messageFromSdk: string | undefined = err?.message || err?.error?.message;
      const code: string | undefined = err?.code || err?.error?.code;
      const statusToThrow = typeof statusFromSdk === 'number' ? (statusFromSdk as HttpStatus) : HttpStatus.INTERNAL_SERVER_ERROR;

      throw new HttpException(
        {
          statusCode: statusToThrow,
          errorCode: code ?? 'unknown_error',
          message: messageFromSdk ?? 'Failed to create chat completion from Gemini API.',
        },
        statusToThrow,
      );
    }
  }
}


