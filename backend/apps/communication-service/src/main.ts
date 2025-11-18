import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('COMMUNICATION_PORT') || 3006;

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
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
      queue: 'communication_service_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(port);

  console.log(`communication-service run successfull on port ${port}`);
}

bootstrap();
