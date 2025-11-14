import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.COMMUNICATION_PORT;
  const tcp_port = parseInt(process.env.TCP_COMMUNICATION_PORT || '5006', 10);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: tcp_port,
    },
  });
  await app.startAllMicroservices();
  await app.listen(3006);
  console.log('communication-service run successfull ');
}

bootstrap();
