import { NestFactory } from '@nestjs/core';
<<<<<<< HEAD
import { AppointmentsModule } from './appointments/appointments.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppointmentsModule);
  const port = process.env.HEALTHCARE_PORT || 3005;
  const tcpPort = parseInt(process.env.TCP_HEALTHCARE_PORT || '5005', 10);

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { port: tcpPort },
  });

  await app.startAllMicroservices();
  await app.listen(port);
  console.log(`✅ Healthcare service running on port ${port}`);
=======
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
>>>>>>> origin/test
}
bootstrap();
