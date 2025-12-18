"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const auth_controller_1 = require("./controllers/auth.controller");
const customer_controller_1 = require("./controllers/customer.controller");
const app_service_1 = require("./app.service");
const config_1 = require("@nestjs/config");
const microservices_1 = require("@nestjs/microservices");
const jwt_1 = require("@nestjs/jwt");
const petcare_controller_1 = require("./controllers/petcare.controller");
const partner_controller_1 = require("./controllers/partner.controller");
const ai_controller_1 = require("./controllers/ai.controller");
const communication_controller_1 = require("./controllers/communication.controller");
const healthcare_controller_1 = require("./controllers/healthcare.controller");
const payment_controller_1 = require("./controllers/payment.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            microservices_1.ClientsModule.registerAsync([
                {
                    name: 'AUTH_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.TCP,
                        options: {
                            host: configService.get('AUTH_HOST') || 'auth-service',
                            port: configService.get('TCP_AUTH_PORT') || 5001,
                        },
                    }),
                },
                {
                    name: 'CUSTOMER_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.TCP,
                        options: {
                            host: configService.get('CUSTOMER_HOST') || 'customer-service',
                            port: configService.get('TCP_CUSTOMER_PORT') || 5002,
                        },
                    }),
                },
                {
                    name: 'PETCARE_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.TCP,
                        options: {
                            host: configService.get('PETCARE_HOST') || 'petcare-service',
                            port: configService.get('TCP_PETCARE_PORT') || 5003,
                        },
                    }),
                },
                {
                    name: 'PARTNER_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.TCP,
                        options: {
                            host: configService.get('PARTNER_HOST') || 'partner-service',
                            port: configService.get('TCP_PARTNER_PORT') || 5004,
                        },
                    }),
                },
                {
                    name: 'HEALTHCARE_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.TCP,
                        options: {
                            host: configService.get('HEALTHCARE_HOST') || 'healthcare-service',
                            port: configService.get('TCP_HEALTHCARE_PORT') || 5005,
                        },
                    }),
                },
                {
                    name: 'COMMUNICATION_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.TCP,
                        options: {
                            host: configService.get('COMMUNICATION_HOST') || 'communication-service',
                            port: configService.get('TCP_COMMUNICATION_PORT') || 5006,
                        },
                    }),
                },
                {
                    name: 'BILLING_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.TCP,
                        options: {
                            host: configService.get('BILLING_HOST') || 'billing-service',
                            port: configService.get('TCP_BILLING_PORT') || 5007,
                        },
                    }),
                },
            ]),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: { expiresIn: '1d' },
                }),
            }),
        ],
        controllers: [
            auth_controller_1.AuthController,
            customer_controller_1.CustomerController,
            petcare_controller_1.PetController,
            partner_controller_1.PartnerController,
            payment_controller_1.PaymentController,
            ai_controller_1.AiController,
            communication_controller_1.CommunicationController,
            healthcare_controller_1.HealthcareController,
        ],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map