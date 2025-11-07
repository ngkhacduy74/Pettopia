import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { RpcToHttpExceptionFilter } from './filters/rpc-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
  );

  app.enableCors({
    origin: ['http://localhost:4001', 'http://localhost:4000'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.enableShutdownHooks();
  app.useGlobalFilters(new RpcToHttpExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('Tài liệu API tổng hợp cho hệ thống')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.API_GATEWAY_PORT!);
  console.log(
    `🚀 API Gateway đang chạy tại http://localhost:${process.env.API_GATEWAY_PORT}`,
  );
  console.log(
    `📘 Swagger docs: http://localhost:${process.env.API_GATEWAY_PORT}/api/v1/docs`,
  );
}

bootstrap();
