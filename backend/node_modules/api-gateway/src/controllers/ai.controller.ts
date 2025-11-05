import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

@Controller('api/v1/ai')
export class AiController {
  constructor(
    @Inject('BILLING_SERVICE')
    private readonly billingService: ClientProxy,
  ) {}

  @Post('/gemini/chat')
  @HttpCode(HttpStatus.OK)
  async createGeminiChatCompletion(@Body() data: any) {
    return await lastValueFrom(
      this.billingService.send({ cmd: 'createGeminiChatCompletion' }, data),
    );
  }

  @Get('/gemini/conversation/:conversationId/history')
  @HttpCode(HttpStatus.OK)
  async getConversationHistory(
    @Param('conversationId') conversationId: string,
    @Query('userId') userId: string,
  ) {
    return await lastValueFrom(
      this.billingService.send(
        { cmd: 'getGeminiConversationHistory' },
        { conversationId, userId },
      ),
    );
  }

  @Delete('/gemini/conversation/:conversationId')
  @HttpCode(HttpStatus.OK)
  async clearConversation(
    @Param('conversationId') conversationId: string,
    @Query('userId') userId: string,
  ) {
    return await lastValueFrom(
      this.billingService.send(
        { cmd: 'clearGeminiConversation' },
        { conversationId, userId },
      ),
    );
  }
}

