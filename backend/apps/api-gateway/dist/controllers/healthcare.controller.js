"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthcareController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const microservices_1 = require("@nestjs/microservices");
const roles_decorator_1 = require("../decorators/roles.decorator");
const jwtAuth_guard_1 = require("../guard/jwtAuth.guard");
const role_guard_1 = require("../guard/role.guard");
const user_decorator_1 = require("../decorators/user.decorator");
const microservices_2 = require("@nestjs/microservices");
let HealthcareController = class HealthcareController {
    healthcareService;
    constructor(healthcareService) {
        this.healthcareService = healthcareService;
    }
    async createAppointment(data, userId) {
        this.healthcareService.emit({ cmd: 'createAppointment' }, {
            data,
            user_id: userId,
        });
        return {
            statusCode: common_1.HttpStatus.ACCEPTED,
            message: 'Yêu cầu tạo lịch hẹn đang được xử lý.',
        };
    }
    async getAppointments(userId, role, clinicId, page = 1, limit = 10) {
        return await (0, rxjs_1.lastValueFrom)(this.healthcareService.send({ cmd: 'getAppointments' }, {
            role,
            userId,
            clinicId,
            page: Number(page),
            limit: Number(limit),
        }));
    }
    async getAppointmentById(appointmentId, userId, role, clinicId) {
        try {
            return await (0, rxjs_1.lastValueFrom)(this.healthcareService.send({ cmd: 'getAppointmentById' }, {
                appointmentId,
                role,
                userId,
                clinicId,
            }));
        }
        catch (error) {
            if (error instanceof microservices_2.RpcException) {
                throw error;
            }
            throw new microservices_2.RpcException({
                status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message || 'Đã xảy ra lỗi khi lấy thông tin lịch hẹn',
            });
        }
    }
    async updateAppointmentStatus(appointmentId, updatedByUserId, updateData) {
        this.healthcareService.emit({ cmd: 'updateAppointmentStatus' }, {
            appointmentId,
            updateData,
            updatedByUserId,
        });
        return {
            statusCode: common_1.HttpStatus.ACCEPTED,
            message: 'Yêu cầu cập nhật trạng thái lịch hẹn đang được xử lý.',
        };
    }
    async cancelAppointment(appointmentId, cancelledByUserId, role, clinicId, cancelData = {}) {
        this.healthcareService.emit({ cmd: 'cancelAppointment' }, {
            appointmentId,
            cancelledByUserId,
            role,
            clinicId,
            cancelData: {
                cancel_reason: cancelData?.cancel_reason,
            },
        });
        return {
            statusCode: common_1.HttpStatus.ACCEPTED,
            message: 'Yêu cầu hủy lịch hẹn đang được xử lý.',
        };
    }
    async createAppointmentForCustomer(data, partnerId) {
        this.healthcareService.emit({ cmd: 'createAppointmentForCustomer' }, {
            data,
            partner_id: partnerId,
        });
        return {
            statusCode: common_1.HttpStatus.ACCEPTED,
            message: 'Yêu cầu tạo lịch hẹn hộ khách hàng đang được xử lý.',
        };
    }
    async getTodayAppointmentsForClinic(clinicId, date, statuses) {
        if (!clinicId) {
            throw new microservices_2.RpcException({
                status: common_1.HttpStatus.BAD_REQUEST,
                message: 'Thiếu thông tin phòng khám',
            });
        }
        const parsedStatuses = Array.isArray(statuses)
            ? statuses
            : statuses
                ? statuses.split(',').map((s) => s.trim())
                : undefined;
        const payload = {
            clinicId,
        };
        if (date) {
            payload.date = date;
        }
        if (parsedStatuses && parsedStatuses.length > 0) {
            payload.statuses = parsedStatuses;
        }
        return await (0, rxjs_1.lastValueFrom)(this.healthcareService.send({ cmd: 'getTodayAppointmentsForClinic' }, payload));
    }
    async assignVetAndStart(appointmentId, vetId) {
        return await (0, rxjs_1.lastValueFrom)(this.healthcareService.send({ cmd: 'assignVetAndStart' }, {
            appointmentId,
            vetId,
        }));
    }
    async createMedicalRecordWithMedications(appointmentId, vetId, clinicId, body) {
        const medicalRecordData = {
            ...body,
            vet_id: body.vet_id || vetId,
            clinic_id: body.clinic_id || clinicId,
        };
        return await (0, rxjs_1.lastValueFrom)(this.healthcareService.send({ cmd: 'createMedicalRecordWithMedications' }, {
            appointmentId,
            medicalRecordData,
        }));
    }
    async completeAppointment(appointmentId) {
        return await (0, rxjs_1.lastValueFrom)(this.healthcareService.send({ cmd: 'completeAppointment' }, { appointmentId }));
    }
    async getMedicalRecordsByPet(petId, role, clinicId, userId) {
        const result = await (0, rxjs_1.lastValueFrom)(this.healthcareService.send({ cmd: 'getMedicalRecordsByPet' }, { petId, role, clinicId, vetId: userId }));
        if (!result || !Array.isArray(result.data)) {
            return result;
        }
        if ((role === roles_decorator_1.Role.CLINIC || role === roles_decorator_1.Role.STAFF || role === roles_decorator_1.Role.VET) &&
            clinicId) {
            result.data = result.data.filter((item) => {
                const recordClinicId = item?.medicalRecord?.clinic_id;
                return recordClinicId === clinicId;
            });
        }
        if (role !== roles_decorator_1.Role.ADMIN) {
            result.data = result.data.map((item) => {
                if (item && item.medicalRecord) {
                    const { clinic_id, vet_id, ...restRecord } = item.medicalRecord;
                    return {
                        ...item,
                        medicalRecord: restRecord,
                    };
                }
                return item;
            });
        }
        return result;
    }
};
exports.HealthcareController = HealthcareController;
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('/appointment'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "createAppointment", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.USER, roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF, roles_decorator_1.Role.CLINIC),
    (0, common_1.Get)('/appointments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.UserToken)('id')),
    __param(1, (0, user_decorator_1.UserToken)('role')),
    __param(2, (0, user_decorator_1.UserToken)('clinic_id')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "getAppointments", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.USER, roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF, roles_decorator_1.Role.CLINIC),
    (0, common_1.Get)('/appointments/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __param(2, (0, user_decorator_1.UserToken)('role')),
    __param(3, (0, user_decorator_1.UserToken)('clinic_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "getAppointmentById", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.STAFF, roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.CLINIC),
    (0, common_1.Patch)('/appointments/:id/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "updateAppointmentStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.USER, roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF, roles_decorator_1.Role.CLINIC),
    (0, common_1.Patch)('/appointments/:id/cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __param(2, (0, user_decorator_1.UserToken)('role')),
    __param(3, (0, user_decorator_1.UserToken)('clinic_id')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "cancelAppointment", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC, roles_decorator_1.Role.STAFF, roles_decorator_1.Role.ADMIN),
    (0, common_1.Post)('/appointment/for-customer'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "createAppointmentForCustomer", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC, roles_decorator_1.Role.STAFF, roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.VET),
    (0, common_1.Get)('/appointments/today'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.UserToken)('clinic_id')),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Query)('statuses')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "getTodayAppointmentsForClinic", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.VET),
    (0, common_1.Post)('/appointments/:id/assign-vet'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "assignVetAndStart", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.VET),
    (0, common_1.Post)('/appointments/:id/medical-records'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __param(2, (0, user_decorator_1.UserToken)('clinic_id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "createMedicalRecordWithMedications", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.VET, roles_decorator_1.Role.CLINIC, roles_decorator_1.Role.STAFF, roles_decorator_1.Role.ADMIN),
    (0, common_1.Post)('/appointments/:id/complete'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "completeAppointment", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.USER, roles_decorator_1.Role.VET, roles_decorator_1.Role.CLINIC, roles_decorator_1.Role.STAFF, roles_decorator_1.Role.ADMIN),
    (0, common_1.Get)('/pets/:id/medical-records'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('role')),
    __param(2, (0, user_decorator_1.UserToken)('clinic_id')),
    __param(3, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "getMedicalRecordsByPet", null);
exports.HealthcareController = HealthcareController = __decorate([
    (0, common_1.Controller)('api/v1/healthcare'),
    __param(0, (0, common_1.Inject)('HEALTHCARE_SERVICE')),
    __metadata("design:paramtypes", [microservices_1.ClientProxy])
], HealthcareController);
//# sourceMappingURL=healthcare.controller.js.map