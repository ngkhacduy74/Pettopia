import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalRpcExceptionFilter } from './filters/rpc-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  // TCP Microservice for RPC
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: configService.get<number>('TCP_AUTH_PORT') || 5001,
    },
  });

  // RMQ Microservice for Emails
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
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
        deadLetterExchange: 'dlx_exchange',
        deadLetterRoutingKey: 'auth_service_queue_dlq',
      },
    },
  });
  // Setup DLQ
  try {
    const rmqUrl = configService.get<string>('RMQ_URL', 'amqp://guest:guest@rabbitmq:5672');
    const connection = await require('amqplib').connect(rmqUrl);
    const channel = await connection.createChannel();

    const dlxExchange = 'dlx_exchange';
    const dlxRoutingKey = 'auth_service_queue_dlq';
    const dlqName = 'auth_service_queue_dlq';

    // 1. Assert DLX
    await channel.assertExchange(dlxExchange, 'direct', { durable: true });

    // 2. Assert DLQ
    await channel.assertQueue(dlqName, { durable: true });

    // 3. Bind DLQ to DLX
    await channel.bindQueue(dlqName, dlxExchange, dlxRoutingKey);

    console.log('DLX and DLQ setup completed successfully');
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('Failed to setup DLX/DLQ:', error);
  }

  app.useGlobalFilters(new GlobalRpcExceptionFilter());
  await app.startAllMicroservices();
  await app.listen(configService.get<number>('AUTH_PORT') || 5001);
  console.log('Auth-service run successfull');
}
bootstrap();
