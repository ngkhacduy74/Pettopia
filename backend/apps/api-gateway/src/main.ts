import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RpcToHttpExceptionFilter } from './filters/rpc-exception.filter';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  /*
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
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
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  }));
  */

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:4001',
    'http://localhost:4000',
    'https://pettopia-fe.onrender.com',
    'https://pettopia-user.onrender.com',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`Blocked CORS from origin: ${origin}`);
        callback(null, false); // Hoặc callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    // QUAN TRỌNG: Đã thêm 'Token' vào danh sách này để sửa lỗi Frontend
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Token', // <--- Header này là nguyên nhân gây lỗi
      'Accept',
      'Origin',
      'X-Csrf-Token',
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
    // new SanitizationPipe(),
  );

  // app.useGlobalInterceptors(new SanitizeResponseInterceptor());

  app.useGlobalFilters(
    new RpcToHttpExceptionFilter(),
    new GlobalExceptionFilter(),
  );

  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Pettopia API Gateway')
    .setDescription(
      'Secured API Gateway with CORS, XSS, and SQL Injection Protection',
    )
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Đảm bảo file .env có API_GATEWAY_PORT=3333
  const port = process.env.API_GATEWAY_PORT || 3000;
  await app.listen(port);

  console.log(` API Gateway running at http://localhost:${port}`);
  console.log(` Swagger docs: http://localhost:${port}/api/v1/docs`);
}

bootstrap();
