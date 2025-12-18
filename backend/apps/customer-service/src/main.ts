import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('CUSTOMER_PORT') || 3002;

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
      queue: 'customer_service_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  const userModel = app.get(getModelToken(User.name));
  await userModel.syncIndexes();
  await app.startAllMicroservices();
  await app.listen(port);
  console.log('Customer-service run successfull');
}
bootstrap();
