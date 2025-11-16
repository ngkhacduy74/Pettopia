import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport, RpcException } from '@nestjs/microservices';

async function bootstrap() {
  const PORT = process.env.PORT ?? 3020;
  const TCP_PORT = parseInt(process.env.TCP_BILLING_PORT || '5007', 10);
  
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      exceptionFactory: (errors) => {
        // Convert validation errors to RpcException for microservice
        const messages = errors.map((error) => {
          const constraints = error.constraints || {};
          return Object.values(constraints).join(', ');
        });
        return new RpcException({
          statusCode: 400,
          message: messages.join('; ') || 'Validation failed',
          error: 'Bad Request',
          errors: errors,
          timestamp: new Date().toISOString(),
        });
      },
    }),
  );
  
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      port: TCP_PORT,
    },
  });
  
  app.use(urlencoded({ extended: true }));
  app.use(json({}));
  
  await app.startAllMicroservices();
  await app.listen(PORT);
  console.log(`VietQR-payos service is running on port ${PORT}`);
  console.log(`Microservice TCP is running on port ${TCP_PORT}`);
}

bootstrap();
