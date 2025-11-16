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
exports.PartnerController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const microservices_1 = require("@nestjs/microservices");
const roles_decorator_1 = require("../decorators/roles.decorator");
const jwtAuth_guard_1 = require("../guard/jwtAuth.guard");
const role_guard_1 = require("../guard/role.guard");
const user_decorator_1 = require("../decorators/user.decorator");
const clinic_update_guard_1 = require("../guard/clinic-update.guard");
let PartnerController = class PartnerController {
    partnerService;
    constructor(partnerService) {
        this.partnerService = partnerService;
    }
    async clinicRegister(data, user_id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'registerClinic' }, { ...data, user_id }));
    }
    async getAllClinicForm(page = 1, limit = 10, status) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getAllClinicForm' }, { page, limit, status }));
    }
    async getAllServices(clinic_id, page = 1, limit = 10) {
        console.log('ládlakjsd', clinic_id);
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getAllServicesFollowClinicId' }, { clinic_id, page, limit }));
    }
    async getAllServicesForAdmin(page = 1, limit = 10) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getAllService' }, { page, limit }));
    }
    async deactivateService(id) {
        if (!id) {
            throw new microservices_1.RpcException({
                status: common_1.HttpStatus.BAD_REQUEST,
                message: 'Thiếu mã dịch vụ',
            });
        }
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'updateServiceStatus' }, { id, is_active: false }));
    }
    async getClinicShifts(page = 1, limit = 10, clinic_id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getClinicShifts' }, { clinic_id, page, limit }));
    }
    async inviteClinicMember(invited_email, role, clinic_id, invited_by) {
        if (!clinic_id) {
            throw new microservices_1.RpcException({
                status: common_1.HttpStatus.BAD_REQUEST,
                message: 'Không xác định được phòng khám.',
            });
        }
        if (!invited_email) {
            throw new microservices_1.RpcException({
                status: common_1.HttpStatus.BAD_REQUEST,
                message: 'Email lời mời là bắt buộc.',
            });
        }
        if (!role) {
            throw new microservices_1.RpcException({
                status: common_1.HttpStatus.BAD_REQUEST,
                message: 'Vai trò lời mời là bắt buộc.',
            });
        }
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'createClinicMemberInvitation' }, {
            clinic_id,
            invited_email,
            role,
            invited_by,
        }));
    }
    async getClinicById(idClinic) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getClinicById' }, { id: idClinic }));
    }
    async getClinicFormById(idForm) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getClinicFormById' }, { id: idForm }));
    }
    async updateStatusClinicForm(idForm, body, review_by) {
        const payload = { id: idForm, ...body, review_by };
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'updateStatusClinicForm' }, payload));
    }
    async updateVetFormStatus(id, data, review_by) {
        const { status, note } = data;
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'updateVetFormStatus' }, { status, note, review_by, id }));
    }
    async findAllClinic(page = 1, limit = 10) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'findAllClinic' }, { page, limit }));
    }
    async updateClinicInfo(idClinic, updateData) {
        const payload = { id: idClinic, ...updateData };
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'updateClinicInfo' }, payload));
    }
    async updateClinicActiveStatus(idClinic, is_active) {
        const payload = { id: idClinic, is_active };
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'updateClinicActiveStatus' }, payload));
    }
    async acceptClinicInvitation(token, vet_id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'acceptClinicMemberInvitation' }, { token, vet_id }));
    }
    async declineClinicInvitation(token) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'declineClinicMemberInvitation' }, { token }));
    }
    async vetRegister(data, user_id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'registerVet' }, { ...data, user_id }));
    }
    async getAllVetForm(page = 1, limit = 10, status) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getAllVetForm' }, { page, limit, status }));
    }
    async getVetFormById(id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getVetFormById' }, { id }));
    }
    async createService(data, clinic_id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'createService' }, { data, clinic_id }));
    }
    async getMyServices(page = 1, limit = 10, clinic_id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getServicesByClinicId' }, { clinic_id, page, limit }));
    }
    update(id, updateServiceDto, clinic_id) {
        return this.partnerService.send({ cmd: 'update_service' }, { serviceId: id, updateServiceDto, clinic_id });
    }
    remove(id, clinic_id) {
        return this.partnerService.send({ cmd: 'remove_service' }, { serviceId: id, clinic_id });
    }
    async updateServiceStatus(idService, is_active) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'updateServiceStatus' }, { id: idService, is_active }));
    }
    async createClinicShift(data, clinic_id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'createClinicShift' }, { ...data, clinic_id }));
    }
    async updateClinicShift(idShift, updateData) {
        const payload = { id: idShift, ...updateData };
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'updateClinicShift' }, payload));
    }
    async deleteClinicShift(idShift, clinic_id) {
        if (!idShift || !clinic_id) {
            throw new common_1.BadRequestException('Thiếu thông tin bắt buộc');
        }
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'deleteClinicShift' }, { id: idShift, clinic_id }));
    }
    async updateClinicShiftStatus(idShift, is_active) {
        const payload = { id: idShift, is_active };
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'updateClinicShiftStatus' }, payload));
    }
    async getShiftsByClinicId(clinic_id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getShiftsByClinicId' }, { clinic_id }));
    }
    async getServicesByClinicId(clinic_id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getServicesByClinicId' }, { clinic_id }));
    }
    async getServiceById(id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'getServiceById' }, { id }));
    }
    async deleteService(serviceId, clinic_id) {
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'remove_service' }, { serviceId, clinic_id }));
    }
    async updateClinicForm(id, dto) {
        if (!id) {
            throw new microservices_1.RpcException('Thiếu ID phòng khám trong URL');
        }
        const payload = { id, dto };
        return await (0, rxjs_1.lastValueFrom)(this.partnerService.send({ cmd: 'updateClinicForm' }, payload));
    }
};
exports.PartnerController = PartnerController;
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('/clinic/register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "clinicRegister", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('/clinic/form'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getAllClinicForm", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Get)('/service/all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.UserToken)('clinic_id')),
    __param(1, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __param(2, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getAllServices", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.Get)('/service/all/admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __param(1, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getAllServicesForAdmin", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.Patch)('/service/:id/deactivate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "deactivateService", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Get)('/clinic/shift'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __param(1, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __param(2, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getClinicShifts", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Post)('/clinic/invitations'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)('email')),
    __param(1, (0, common_1.Body)('role')),
    __param(2, (0, user_decorator_1.UserToken)('clinic_id')),
    __param(3, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "inviteClinicMember", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('/clinic/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getClinicById", null);
__decorate([
    (0, common_1.Get)('/clinic/form/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getClinicFormById", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.Post)('/clinic/status/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "updateStatusClinicForm", null);
__decorate([
    (0, common_1.Patch)('/vet/status/form/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "updateVetFormStatus", null);
__decorate([
    (0, common_1.Get)('/clinic'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __param(1, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "findAllClinic", null);
__decorate([
    (0, common_1.Patch)('/clinic/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "updateClinicInfo", null);
__decorate([
    (0, common_1.Patch)('/clinic/active/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('is_active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "updateClinicActiveStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.USER, roles_decorator_1.Role.VET),
    (0, common_1.Post)('/clinic/invitations/:token/accept'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "acceptClinicInvitation", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.VET),
    (0, common_1.Post)('/clinic/invitations/:token/decline'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "declineClinicInvitation", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.USER),
    (0, common_1.Post)('/vet/register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "vetRegister", null);
__decorate([
    (0, common_1.Get)('/vet/form'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __param(1, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getAllVetForm", null);
__decorate([
    (0, common_1.Get)('/vet/form/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getVetFormById", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Post)('/service'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "createService", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Get)('/service'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __param(1, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __param(2, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getMyServices", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.UserToken)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PartnerController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PartnerController.prototype, "remove", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Patch)('/service/status/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('is_active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "updateServiceStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Post)('/clinic/shift'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "createClinicShift", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Put)('/clinic/shift/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "updateClinicShift", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Delete)('/clinic/shift/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('clinic_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "deleteClinicShift", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Patch)('/clinic/shift/:id/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('is_active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "updateClinicShiftStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('/clinic/shift/:clinic_id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('clinic_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getShiftsByClinicId", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.USER),
    (0, common_1.Get)('/service/:clinic_id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('clinic_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getServicesByClinicId", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF, roles_decorator_1.Role.CLINIC),
    (0, common_1.Get)('/service/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getServiceById", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.CLINIC),
    (0, common_1.Delete)('/service/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('clinic_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "deleteService", null);
__decorate([
    (0, common_1.UseGuards)(clinic_update_guard_1.ClinicUpdateGuard),
    (0, common_1.Put)('/verify-clinic/update-form/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "updateClinicForm", null);
exports.PartnerController = PartnerController = __decorate([
    (0, common_1.Controller)('api/v1/partner'),
    __param(0, (0, common_1.Inject)('PARTNER_SERVICE')),
    __metadata("design:paramtypes", [microservices_1.ClientProxy])
], PartnerController);
//# sourceMappingURL=partner.controller.js.map