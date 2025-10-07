import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.CUSTOMER_PORT;
  const tcp_port = parseInt(process.env.TCP_CUSTOMER_PORT || '5002', 10);
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
      port: tcp_port,
    },
  });
  await app.startAllMicroservices();
  await app.listen(port!);
  console.log('Customer-service run successfull');
}
bootstrap();
