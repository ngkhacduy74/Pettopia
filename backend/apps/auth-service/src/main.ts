import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ, // <-- SỬA: Dùng giao thức RabbitMQ
    options: {
      urls: [
        configService.get<string>(
          'RMQ_URL',
          'amqp://guest:guest@rabbitmq:5672',
        ),
      ],
      queue: 'auth_service_queue',
      queueOptions: {
        durable: true,
      },
    },
  });
  await app.startAllMicroservices();
  await app.listen(configService.get<number>('AUTH_PORT') || 5001);
  console.log('Auth-service run successfull');
}
bootstrap();
