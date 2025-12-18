"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const rpc_exception_filter_1 = require("./filters/rpc-exception.filter");
const global_exception_filter_1 = require("./filters/global-exception.filter");
const sanitize_response_interceptor_1 = require("./interceptors/sanitize-response.interceptor");
const sanitization_pipe_1 = require("./pipes/sanitization.pipe");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    app.use((0, helmet_1.default)({
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
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:4001',
        'http://localhost:4000',
        'https://pettopia-fe.onrender.com',
        'https://pettopia-user.onrender.com',
    ];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        credentials: true,
        maxAge: 3600,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: true,
        exceptionFactory: (errors) => new common_1.BadRequestException(errors),
    }), new sanitization_pipe_1.SanitizationPipe());
    app.useGlobalInterceptors(new sanitize_response_interceptor_1.SanitizeResponseInterceptor());
    app.useGlobalFilters(new rpc_exception_filter_1.RpcToHttpExceptionFilter(), new global_exception_filter_1.GlobalExceptionFilter());
    app.enableShutdownHooks();
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Pettopia API Gateway')
        .setDescription('Secured API Gateway with CORS, XSS, and SQL Injection Protection')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/v1/docs', app, document, {
        swaggerOptions: { persistAuthorization: true },
    });
    await app.listen(process.env.API_GATEWAY_PORT || 3000);
    console.log(` API Gateway running at http://localhost:${process.env.API_GATEWAY_PORT || 3000}`);
    console.log(` Swagger docs: http://localhost:${process.env.API_GATEWAY_PORT || 3000}/api/v1/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map