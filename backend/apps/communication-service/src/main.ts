import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { GlobalRpcExceptionFilter } from './filters/rpc-exception.filter';
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
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: configService.get<number>('TCP_COMMUNICATION_PORT') || 5006,
    },
  });

  app.useGlobalFilters(new GlobalRpcExceptionFilter());
  await app.startAllMicroservices();
  await app.listen(port);

  console.log(`communication-service run successfull on port ${port}`);
}

bootstrap();
