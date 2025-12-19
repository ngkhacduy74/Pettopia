import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { ConversationService } from './conversation.service';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'HEALTHCARE_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RMQ_URL',
                'amqp://guest:guest@rabbitmq:5672',
              ),
            ],
            queue: 'healthcare_service_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'PARTNER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RMQ_URL',
                'amqp://guest:guest@rabbitmq:5672',
              ),
            ],
            queue: 'partner_service_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [GeminiController],
  providers: [
    GeminiService,
    ConversationService,
    {
      provide: GoogleGenerativeAI,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.getOrThrow<string>('GEMINI_API_KEY');
        return new GoogleGenerativeAI(apiKey);
      },
      inject: [ConfigService],
    },
    {
      provide: 'GEMINI_MODEL',
      useFactory: (
        genAI: GoogleGenerativeAI,
        configService: ConfigService,
      ): GenerativeModel => {
        const modelName =
          configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';
        const systemInstruction =
          configService.get<string>('GEMINI_SYSTEM_PROMPT') ||
          'You are a helpful assistant. Always continue the conversation based on prior messages and keep context across turns. Answer in the language of the user.';
        return genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });
      },
      inject: [GoogleGenerativeAI, ConfigService],
    },
  ],
  // 👇 QUAN TRỌNG: Thêm dòng này để các module khác dùng được GeminiService
  exports: [GeminiService],
})
export class GeminiModule { }