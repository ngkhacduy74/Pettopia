"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const port = process.env.PETCARE_PORT;
    const tcp_port = parseInt(process.env.TCP_COMMUNICATION_PORT || '5006', 10);
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
    }));
    app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
        options: {
            port: tcp_port,
        },
    });
    await app.startAllMicroservices();
    await app.listen(port);
    console.log('Pet-service run successfull');
}
bootstrap();
//# sourceMappingURL=main.js.map