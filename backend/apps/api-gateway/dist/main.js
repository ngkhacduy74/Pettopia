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
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    app.use((0, helmet_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: true,
        exceptionFactory: (errors) => new common_1.BadRequestException(errors),
    }));
    app.enableCors({
        origin: ['http://localhost:4001', 'http://localhost:4000'],
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        credentials: true,
    });
    app.enableShutdownHooks();
    app.useGlobalFilters(new rpc_exception_filter_1.RpcToHttpExceptionFilter());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('API Gateway')
        .setDescription('Tài liệu API tổng hợp cho hệ thống')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/v1/docs', app, document, {
        swaggerOptions: { persistAuthorization: true },
    });
    await app.listen(process.env.API_GATEWAY_PORT);
    console.log(`🚀 API Gateway running at http://localhost:${process.env.API_GATEWAY_PORT}`);
    console.log(`📘 Swagger docs: http://localhost:${process.env.API_GATEWAY_PORT}/api/v1/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map