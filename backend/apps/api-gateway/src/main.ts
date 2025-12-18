import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { RpcToHttpExceptionFilter } from './filters/rpc-exception.filter';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { SanitizeResponseInterceptor } from './interceptors/sanitize-response.interceptor';
import { SanitizationPipe } from './pipes/sanitization.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Security headers with Helmet (CSP disabled to allow external images)
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled - causes issues with external resources
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
  }));

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:4001',
    'http://localhost:4000',
    'https://pettopia-fe.onrender.com',
    'https://pettopia-user.onrender.com',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 3600,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'token',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
    new SanitizationPipe(), // Fixed: now whitelists URLs
  );


  app.useGlobalInterceptors(new SanitizeResponseInterceptor()); // Fixed: now whitelists URLs


  app.useGlobalFilters(
    new RpcToHttpExceptionFilter(),
    new GlobalExceptionFilter(),
  );

  app.enableShutdownHooks();


  const config = new DocumentBuilder()
    .setTitle('Pettopia API Gateway')
    .setDescription('Secured API Gateway with CORS, XSS, and SQL Injection Protection')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.API_GATEWAY_PORT || 3000);

  console.log(` API Gateway running at http://localhost:${process.env.API_GATEWAY_PORT || 3000}`);
  console.log(` Swagger docs: http://localhost:${process.env.API_GATEWAY_PORT || 3000}/api/v1/docs`);

}

bootstrap();
