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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const microservices_1 = require("@nestjs/microservices");
const user_decorator_1 = require("../decorators/user.decorator");
const jwtAuth_guard_1 = require("../guard/jwtAuth.guard");
const role_guard_1 = require("../guard/role.guard");
const roles_decorator_1 = require("../decorators/roles.decorator");
let AuthController = class AuthController {
    authService;
    customerService;
    constructor(authService, customerService) {
        this.authService = authService;
        this.customerService = customerService;
    }
    async test(id) {
        return (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'test' }, {}));
    }
    async login(data) {
        console.log(data);
        return (0, rxjs_1.lastValueFrom)(this.authService.send({ cmd: 'login' }, data));
    }
    async register(data) {
        return (0, rxjs_1.lastValueFrom)(this.authService.send({ cmd: 'register' }, data));
    }
    async sendOtpEmail(email) {
        return await (0, rxjs_1.lastValueFrom)(this.authService.send({ cmd: 'send-otp-email' }, { email }));
    }
    async sendClinicVerification(clinic_id) {
        return await (0, rxjs_1.lastValueFrom)(this.authService.send({ cmd: 'sendClinicVerificationMail' }, { clinic_id }));
    }
    async verifyClinic(token) {
        try {
            return await (0, rxjs_1.lastValueFrom)(this.authService.send({ cmd: 'verifyClinicToken' }, { token }));
        }
        catch (error) {
            throw new microservices_1.RpcException(error);
        }
    }
    async convertLocation(address) {
        try {
            return await (0, rxjs_1.lastValueFrom)(this.authService.send({ cmd: 'convert-location' }, { address }));
        }
        catch (err) {
            throw new microservices_1.RpcException(err);
        }
    }
    async forgotPassword(data) {
        return await (0, rxjs_1.lastValueFrom)(this.authService.send({ cmd: 'forgot-password' }, data));
    }
    async resetPassword(data) {
        return await (0, rxjs_1.lastValueFrom)(this.authService.send({ cmd: 'reset-password' }, data));
    }
    async changePassword(data, userId) {
        return await (0, rxjs_1.lastValueFrom)(this.authService.send({ cmd: 'change-password' }, { ...data, userId }));
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('/test'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "test", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('send-otp-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtpEmail", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.Post)('send-clinic-verification'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('clinic_id_form')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendClinicVerification", null);
__decorate([
    (0, common_1.Get)('verify/clinic'),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyClinic", null);
__decorate([
    (0, common_1.Post)('convert/location'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "convertLocation", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('change-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('api/v1/auth'),
    __param(0, (0, common_1.Inject)('AUTH_SERVICE')),
    __param(1, (0, common_1.Inject)('CUSTOMER_SERVICE')),
    __metadata("design:paramtypes", [microservices_1.ClientProxy,
        microservices_1.ClientProxy])
], AuthController);
//# sourceMappingURL=auth.controller.js.map