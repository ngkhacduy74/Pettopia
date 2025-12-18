import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentModule } from './payment/payment.module';
import { SgStableDiffusionModule } from './AI_img/sg-stable-diffusion/sg-stable-diffusion.module';
import { StableDifusionIntegrationModule } from './AI_img/stable-difusion-integration/stable-difusion-integration.module';
import { GeminiModule } from './AI_req_res/gemini/gemini.module';
// ĐÃ XÓA: import { GeminiService } from ... (Không cần thiết ở đây)

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('BILLING_DB_URI'),
      }),
    }),
    PaymentModule,
    SgStableDiffusionModule,
    StableDifusionIntegrationModule,
    GeminiModule, // GeminiService đã nằm trong này rồi
  ],
  controllers: [AppController],
  providers: [AppService], // ĐÃ SỬA: Chỉ giữ lại AppService
})
export class AppModule { }