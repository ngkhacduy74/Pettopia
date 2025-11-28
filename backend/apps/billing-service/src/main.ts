import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
import {
  MicroserviceOptions,
  Transport,
  RpcException,
} from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const PORT = process.env.PORT ?? 3020;
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = error.constraints || {};
          return Object.values(constraints).join(', ');
        });
        return new RpcException({
          statusCode: 400,
          message: messages.join('; ') || 'Validation failed',
          error: 'Bad Request',
          errors: errors,
          timestamp: new Date().toISOString(),
        } as any);
      },
    }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        configService.get<string>(
          'RMQ_URL',
          'amqp://guest:guest@rabbitmq:5672',
        ),
      ],
      queue: 'billing_service_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  app.use(urlencoded({ extended: true }));
  app.use(json({}));

  await app.startAllMicroservices();
  await app.listen(PORT);

  console.log(`VietQR-payos service is running on port ${PORT}`);
  // Bỏ qua in TCP_PORT vì không dùng nữa
  console.log(`Microservice RMQ is listening on queue 'billing_service_queue'`);
}

bootstrap();
