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
const mongoose_1 = require("@nestjs/mongoose");
const post_controller_1 = require("./controllers/post.controller");
const post_service_1 = require("./services/post.service");
const post_repository_1 = require("./repositories/post.repository");
const post_schemas_1 = require("./schemas/post.schemas");
const microservices_1 = require("@nestjs/microservices");
const config_1 = require("@nestjs/config");
const prometheus_controller_1 = require("./controllers/prometheus.controller");
const prometheus_service_1 = require("./services/prometheus.service");
const prometheus_middleware_1 = require("./middleware/prometheus.middleware");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(prometheus_middleware_1.PrometheusMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    uri: configService.get('POST_DB_URI'),
                }),
            }),
            mongoose_1.MongooseModule.forFeature([{ name: post_schemas_1.Post.name, schema: post_schemas_1.PostSchema }]),
            microservices_1.ClientsModule.register([
                {
                    name: 'CUSTOMER_SERVICE',
                    transport: microservices_1.Transport.TCP,
                    options: {
                        host: process.env.NODE_ENV === 'production'
                            ? 'customer-service'
                            : 'localhost',
                        port: 5002,
                    },
                },
                {
                    name: 'AUTH_SERVICE',
                    transport: microservices_1.Transport.TCP,
                    options: {
                        host: process.env.NODE_ENV === 'production'
                            ? 'auth-service'
                            : 'localhost',
                        port: 5001,
                    },
                },
            ]),
        ],
        controllers: [post_controller_1.PostController, prometheus_controller_1.PrometheusController],
        providers: [post_service_1.PostService, post_repository_1.PostRepository, prometheus_service_1.PrometheusService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map