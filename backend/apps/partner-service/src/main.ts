import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { GlobalRpcExceptionFilter } from './filters/rpc-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('PARTNER_PORT') || 3004;

  app.use(helmet());

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: configService.get<number>('TCP_PARTNER_PORT') || 5004,
    },
  });

  app.useGlobalFilters(new GlobalRpcExceptionFilter());
  await app.startAllMicroservices();
  await app.listen(port);

  console.log('Partner-service run successfull');
}
bootstrap();
