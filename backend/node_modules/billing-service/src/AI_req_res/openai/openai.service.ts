import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatCompletionMessageDto } from './dto/create-chat-completion.request';
import { ChatCompletionMessageParam } from 'openai/resources';

@Injectable()
export class OpenaiService {
  constructor(private readonly openai: OpenAI) {}

  async createChatCompletion(messages: ChatCompletionMessageDto[]) {
    try {
      return await this.openai.chat.completions.create({
        messages: messages as ChatCompletionMessageParam[],
        model: 'gpt-4o',
      });
    } catch (err: any) {
      const statusFromSdk: number | undefined = err?.status;
      const messageFromSdk: string | undefined = err?.error?.message || err?.message;
      const code: string | undefined = err?.code || err?.error?.code;
      let statusToThrow = HttpStatus.INTERNAL_SERVER_ERROR;
      if (code === 'model_not_found') {
        statusToThrow = HttpStatus.NOT_FOUND;
      } else if (code === 'insufficient_quota') {
        statusToThrow = HttpStatus.TOO_MANY_REQUESTS; 
      } else if (typeof statusFromSdk === 'number') {
        statusToThrow = statusFromSdk as HttpStatus;
      }

      throw new HttpException(
        {
          statusCode: statusToThrow,
          errorCode: code ?? 'unknown_error',
          message:
            messageFromSdk ?? 'Failed to create chat completion from OpenAI API.',
        },
        statusToThrow,
      );
    }
  }
}
