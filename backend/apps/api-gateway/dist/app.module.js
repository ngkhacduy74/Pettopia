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
                        transport: microservices_1.Transport.RMQ,
                        options: {
                            urls: [
                                configService.get('RMQ_URL', 'amqp://guest:guest@rabbitmq:5672'),
                            ],
                            queue: 'auth_service_queue',
                            queueOptions: {
                                durable: true,
                            },
                        },
                    }),
                },
                {
                    name: 'CUSTOMER_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.RMQ,
                        options: {
                            urls: [
                                configService.get('RMQ_URL', 'amqp://guest:guest@rabbitmq:5672'),
                            ],
                            queue: 'customer_service_queue',
                            queueOptions: {
                                durable: true,
                            },
                        },
                    }),
                },
                {
                    name: 'PETCARE_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.RMQ,
                        options: {
                            urls: [
                                configService.get('RMQ_URL', 'amqp://guest:guest@rabbitmq:5672'),
                            ],
                            queue: 'petcare_service_queue',
                            queueOptions: {
                                durable: true,
                            },
                        },
                    }),
                },
                {
                    name: 'PARTNER_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.RMQ,
                        options: {
                            urls: [
                                configService.get('RMQ_URL', 'amqp://guest:guest@rabbitmq:5672'),
                            ],
                            queue: 'partner_service_queue',
                            queueOptions: {
                                durable: true,
                            },
                        },
                    }),
                },
                {
                    name: 'HEALTHCARE_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.RMQ,
                        options: {
                            urls: [
                                configService.get('RMQ_URL', 'amqp://guest:guest@rabbitmq:5672'),
                            ],
                            queue: 'healthcare_service_queue',
                            queueOptions: {
                                durable: true,
                            },
                        },
                    }),
                },
                {
                    name: 'COMMUNICATION_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.RMQ,
                        options: {
                            urls: [
                                configService.get('RMQ_URL', 'amqp://guest:guest@rabbitmq:5672'),
                            ],
                            queue: 'communication_service_queue',
                            queueOptions: {
                                durable: true,
                            },
                        },
                    }),
                },
                {
                    name: 'BILLING_SERVICE',
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: (configService) => ({
                        transport: microservices_1.Transport.RMQ,
                        options: {
                            urls: [
                                configService.get('RMQ_URL', 'amqp://guest:guest@rabbitmq:5672'),
                            ],
                            queue: 'billing_service_queue',
                            queueOptions: {
                                durable: true,
                            },
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