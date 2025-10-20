import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.HEALTHCARE_PORT;
  const tcp_port = parseInt(process.env.TCP_HEALTHCARE_PORT || '5005', 10);
  app.use(helmet());
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      port: tcp_port,
    },
  });

  await app.startAllMicroservices();
  await app.listen(port!);
  console.log('Healthcare-service run successfull');
}
bootstrap();
