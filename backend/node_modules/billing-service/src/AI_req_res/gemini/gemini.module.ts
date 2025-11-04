import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';

@Module({
  imports: [ConfigModule],
  controllers: [GeminiController],
  providers: [
    GeminiService,
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
      useFactory: (genAI: GoogleGenerativeAI, configService: ConfigService): GenerativeModel => {
  
        const modelName = configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';
        return genAI.getGenerativeModel({ model: modelName });  
      },
      inject: [GoogleGenerativeAI, ConfigService],
    },
  ],
})
export class GeminiModule {}


