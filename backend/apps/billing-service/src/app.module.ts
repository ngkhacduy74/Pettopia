import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentModule } from './payment/payment.module';
import { SgStableDiffusionModule } from './AI_img/sg-stable-diffusion/sg-stable-diffusion.module';
import { StableDifusionIntegrationModule } from './AI_img/stable-difusion-integration/stable-difusion-integration.module';
import { OpenaiModule } from './AI_req_res/openai/openai.module';

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
    OpenaiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
