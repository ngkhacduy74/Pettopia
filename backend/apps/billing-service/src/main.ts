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
import { GlobalRpcExceptionFilter } from './filters/rpc-exception.filter';

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
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: configService.get<number>('TCP_BILLING_PORT') || 5007,
    },
  });

  app.use(urlencoded({ extended: true }));
  app.use(json({}));

  app.useGlobalFilters(new GlobalRpcExceptionFilter());
  await app.startAllMicroservices();
  await app.listen(PORT);

  console.log(`VietQR-payos service is running on port ${PORT}`);
  // Bỏ qua in TCP_PORT vì không dùng nữa
  console.log(`Microservice RMQ is listening on queue 'billing_service_queue'`);
}

bootstrap();
