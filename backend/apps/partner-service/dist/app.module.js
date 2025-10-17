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
const clinic_controller_1 = require("./controllers/clinic/clinic.controller");
const clinic_service_1 = require("./services/clinic/clinic.service");
const config_1 = require("@nestjs/config");
const clinic_register_schema_1 = require("./schemas/clinic/clinic-register.schema");
const mongoose_1 = require("@nestjs/mongoose");
const clinic_repositories_1 = require("./repositories/clinic/clinic.repositories");
const clinic_schema_1 = require("./schemas/clinic/clinic.schema");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const vet_repositories_1 = require("./repositories/vet/vet.repositories");
const vet_service_1 = require("./services/vet/vet.service");
const vet_register_schema_1 = require("./schemas/vet/vet-register.schema");
const vet_schema_1 = require("./schemas/vet/vet.schema");
const vet_controller_1 = require("./controllers/vet/vet.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 10,
                },
            ]),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    uri: configService.get('PARTNER_DB_URI'),
                }),
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: clinic_register_schema_1.Clinic_Register.name, schema: clinic_register_schema_1.ClinicRegisterSchema },
                { name: clinic_schema_1.Clinic.name, schema: clinic_schema_1.ClinicSchema },
                { name: vet_register_schema_1.Vet_Register.name, schema: vet_register_schema_1.VetRegisterSchema },
                { name: vet_schema_1.Vet.name, schema: vet_schema_1.VetSchema },
            ]),
        ],
        controllers: [clinic_controller_1.ClinicController, vet_controller_1.VetController],
        providers: [
            clinic_service_1.ClinicService,
            clinic_repositories_1.ClinicsRepository,
            vet_repositories_1.VetRepository,
            vet_service_1.VetService,
            {
                provide: core_1.APP_PIPE,
                useValue: new common_1.ValidationPipe({
                    whitelist: true,
                    forbidNonWhitelisted: true,
                    transform: true,
                    forbidUnknownValues: true,
                }),
            },
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map