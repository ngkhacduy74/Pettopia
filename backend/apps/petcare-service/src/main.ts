import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  app.setGlobalPrefix('api/v1');
  
  const port = process.env.PORT || 3003;
  await app.listen(port);
  
  console.log(`PetCare Service is running on: http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api/v1/pets`);
}

bootstrap();
