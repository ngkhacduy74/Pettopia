"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const microservices_1 = require("@nestjs/microservices");
const helmet_1 = __importDefault(require("helmet"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const port = process.env.PARTNER_PORT;
    const tcp_port = parseInt(process.env.TCP_PARTNER_PORT || '5004', 10);
    app.use((0, helmet_1.default)());
    app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
        options: {
            port: tcp_port,
        },
    });
    await app.startAllMicroservices();
    await app.listen(port);
    console.log('Partnerr-service run successfull');
}
bootstrap();
//# sourceMappingURL=main.js.map