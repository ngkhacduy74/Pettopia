import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { GlobalRpcExceptionFilter } from './filters/rpc-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('HEALTHCARE_PORT') || 3005;

  app.use(helmet());

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: configService.get<number>('TCP_HEALTHCARE_PORT') || 5005,
    },
  });

  app.useGlobalFilters(new GlobalRpcExceptionFilter());
  await app.startAllMicroservices();
  await app.listen(port);

  console.log('Healthcare-service run successfull');
}
bootstrap();
