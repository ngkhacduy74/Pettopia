"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const appointments_module_1 = require("./appointments/appointments.module");
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
async function bootstrap() {
    const app = await core_1.NestFactory.create(appointments_module_1.AppointmentsModule);
    const port = process.env.HEALTHCARE_PORT || 3005;
    const tcpPort = parseInt(process.env.TCP_HEALTHCARE_PORT || '5005', 10);
    app.useGlobalPipes(new common_1.ValidationPipe({ transform: true, whitelist: true }));
    app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
        options: { port: tcpPort },
    });
    await app.startAllMicroservices();
    await app.listen(port);
    console.log(`✅ Healthcare service running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map