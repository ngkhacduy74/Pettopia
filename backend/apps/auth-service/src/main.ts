import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport:Transport.TCP,
    options:{
      port: parseInt(process.env.TCP_AUTH_PORT || '5001', 10),
    }
  })
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );
  await app.startAllMicroservices();
  await app.listen(process.env.AUTH_PORT!);
  console.log('Auth-service run successfull');
}
bootstrap();
