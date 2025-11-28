import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('HEALTHCARE_PORT') || 3005;

  app.use(helmet());

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ, // SỬA: Chuyển sang RMQ
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
  });

  await app.startAllMicroservices();
  await app.listen(port);

  console.log('Healthcare-service run successfull');
}
bootstrap();
