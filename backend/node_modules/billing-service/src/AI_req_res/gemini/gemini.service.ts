import { HttpException, HttpStatus, Injectable, Inject } from '@nestjs/common';
import { GenerativeModel } from '@google/generative-ai';
import { ChatCompletionMessageDto } from '../openai/dto/create-chat-completion.request';

@Injectable()
export class GeminiService {
  constructor(
    @Inject('GEMINI_MODEL') private readonly model: GenerativeModel,
  ) {}

  async createChatCompletion(messages: ChatCompletionMessageDto[]) {
    try {
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const result = await this.model.generateContent({ contents });
      const response = result.response;

      return {
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


