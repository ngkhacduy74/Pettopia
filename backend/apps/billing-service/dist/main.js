"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const express_1 = require("express");
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
async function bootstrap() {
    const PORT = process.env.PORT ?? 3020;
    const TCP_PORT = parseInt(process.env.TCP_PAYMENT_PORT || '5007', 10);
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
    }));
    app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
        options: {
            port: TCP_PORT,
        },
    });
    app.use((0, express_1.urlencoded)({ extended: true }));
    app.use((0, express_1.json)({}));
    await app.startAllMicroservices();
    await app.listen(PORT);
    console.log(`VietQR-payos service is running on port ${PORT}`);
    console.log(`Microservice TCP is running on port ${TCP_PORT}`);
}
bootstrap();
//# sourceMappingURL=main.js.map