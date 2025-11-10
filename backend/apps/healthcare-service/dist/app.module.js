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
const appointment_controller_1 = require("./controllers/appointment.controller");
const appointment_service_1 = require("./services/appointment.service");
const appointment_repositories_1 = require("./repositories/appointment.repositories");
const appoinment_schema_1 = require("./schemas/appoinment.schema");
const mongoose_1 = require("@nestjs/mongoose");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const medical_record_schema_1 = require("./schemas/medical_record.schema");
const preciption_schema_1 = require("./schemas/preciption.schema");
const vet_schedule_schema_1 = require("./schemas/vet_schedule.schema");
const microservices_1 = require("@nestjs/microservices");
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
            microservices_1.ClientsModule.register([
                {
                    name: 'CUSTOMER_SERVICE',
                    transport: microservices_1.Transport.TCP,
                    options: {
                        port: 5002,
                    },
                },
                {
                    name: 'PARTNER_SERVICE',
                    transport: microservices_1.Transport.TCP,
                    options: {
                        port: 5004,
                    },
                },
                {
                    name: 'AUTH_SERVICE',
                    transport: microservices_1.Transport.TCP,
                    options: {
                        port: 5001,
                    },
                },
            ]),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    uri: configService.get('HEALTHCARE_DB_URI'),
                }),
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: appoinment_schema_1.Appointment.name, schema: appoinment_schema_1.AppointmentSchema },
                { name: medical_record_schema_1.MedicalRecord.name, schema: medical_record_schema_1.MedicalRecordSchema },
                { name: preciption_schema_1.Medication.name, schema: preciption_schema_1.MedicationSchema },
                { name: vet_schedule_schema_1.Vet_Schedule.name, schema: vet_schedule_schema_1.VetScheduleSchema },
            ]),
        ],
        controllers: [appointment_controller_1.AppointmentController],
        providers: [
            appointment_service_1.AppointmentService,
            appointment_repositories_1.AppointmentRepository,
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