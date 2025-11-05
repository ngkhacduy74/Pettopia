import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { ChatCompletionMessageDto } from '../openai/dto/create-chat-completion.request';
import { randomUUID } from 'crypto';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
  ) {}

  async getOrCreateConversation(
    userId: string,
    conversationId?: string,
  ): Promise<ConversationDocument> {
    if (conversationId) {
      const conversation = await this.conversationModel.findOne({
        conversationId,
        userId,
      });
      if (conversation) {
        return conversation;
      }
    }


    const newConversationId = conversationId || randomUUID();
    const conversation = new this.conversationModel({
      userId,
      conversationId: newConversationId,
      messages: [],
    });
    return await conversation.save();
  }

  async addMessage(
    conversationId: string,
    userId: string,
    message: ChatCompletionMessageDto,
  ): Promise<ConversationDocument> {
    const conversation = await this.getOrCreateConversation(
      userId,
      conversationId,
    );

    conversation.messages.push({
      ...message,
      timestamp: new Date(),
    });

    
    (conversation as any).markModified?.('messages');

    conversation.updatedAt = new Date();
    return await conversation.save();
  }

  async getLatestConversation(userId: string): Promise<ConversationDocument | null> {
    return this.conversationModel
      .findOne({ userId })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getConversationHistory(
    conversationId: string,
    userId: string,
  ): Promise<ChatCompletionMessageDto[]> {
    const conversation = await this.conversationModel.findOne({
      conversationId,
      userId,
    });

    if (!conversation) {
      return [];
    }

    return conversation.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  async clearConversation(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.conversationModel.deleteOne({
      conversationId,
      userId,
    });
    return result.deletedCount > 0;
  }
}

