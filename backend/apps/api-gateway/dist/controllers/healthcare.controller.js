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
        try {
            console.log('1928ujkasd');
            return await (0, rxjs_1.lastValueFrom)(this.healthcareService.send({ cmd: 'createAppointment' }, {
                data,
                user_id: userId,
            }));
        }
        catch (error) {
            if (error instanceof microservices_2.RpcException) {
                throw error;
            }
            throw new microservices_2.RpcException({
                status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message || 'Đã xảy ra lỗi khi tạo lịch hẹn',
            });
        }
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
        try {
            return await (0, rxjs_1.lastValueFrom)(this.healthcareService.send({ cmd: 'updateAppointmentStatus' }, {
                appointmentId,
                updateData,
                updatedByUserId,
            }));
        }
        catch (error) {
            if (error instanceof microservices_2.RpcException) {
                throw error;
            }
            throw new microservices_2.RpcException({
                status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message || 'Đã xảy ra lỗi khi cập nhật trạng thái lịch hẹn',
            });
        }
    }
    async cancelAppointment(appointmentId, cancelledByUserId, role, clinicId, cancelData = {}) {
        try {
            return await (0, rxjs_1.lastValueFrom)(this.healthcareService.send({ cmd: 'cancelAppointment' }, {
                appointmentId,
                cancelledByUserId,
                role,
                clinicId,
                cancelData: {
                    cancel_reason: cancelData?.cancel_reason,
                },
            }));
        }
        catch (error) {
            if (error instanceof microservices_2.RpcException) {
                throw error;
            }
            throw new microservices_2.RpcException({
                status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message || 'Đã xảy ra lỗi khi hủy lịch hẹn',
            });
        }
    }
    async createAppointmentForCustomer(data, partnerId) {
        try {
            return await (0, rxjs_1.lastValueFrom)(this.healthcareService.send({ cmd: 'createAppointmentForCustomer' }, {
                data,
                partner_id: partnerId,
            }));
        }
        catch (error) {
            if (error instanceof microservices_2.RpcException) {
                throw error;
            }
            throw new microservices_2.RpcException({
                status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message || 'Đã xảy ra lỗi khi tạo lịch hẹn hộ khách hàng',
            });
        }
    }
};
exports.HealthcareController = HealthcareController;
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('/appointment'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
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
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
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
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
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
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], HealthcareController.prototype, "createAppointmentForCustomer", null);
exports.HealthcareController = HealthcareController = __decorate([
    (0, common_1.Controller)('api/v1/healthcare'),
    __param(0, (0, common_1.Inject)('HEALTHCARE_SERVICE')),
    __metadata("design:paramtypes", [microservices_1.ClientProxy])
], HealthcareController);
//# sourceMappingURL=healthcare.controller.js.map