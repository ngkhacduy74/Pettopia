import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PARTNER_PORT;
  const tcp_port = parseInt(process.env.TCP_PARTNER_PORT || '5004', 10);
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
  console.log('Partnerr-service run successfull');
}
bootstrap();
