import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, unique: true })
  conversationId: string;

  @Prop({
    type: [
      {
        role: { type: String, required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, required: false },
      },
    ],
    default: [],
  })
  messages: Array<{ role: string; content: string; timestamp?: Date }>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ userId: 1, conversationId: 1 });

