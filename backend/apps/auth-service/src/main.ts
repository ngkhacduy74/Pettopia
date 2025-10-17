import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      port: 5001,
    },
  });
  await app.startAllMicroservices();
  await app.listen(process.env.AUTH_PORT!);
  console.log('Auth-service run successfull');
}
bootstrap();
