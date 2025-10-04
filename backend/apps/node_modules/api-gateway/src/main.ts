import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
  );
  await app.listen(process.env.API_GATEWAY_PORT!);
  console.log(`api gateway đang chạy tên cổng ${process.env.API_GATEWAY_PORT}`);
}
bootstrap();
