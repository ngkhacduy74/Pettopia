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
exports.CustomerController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const microservices_1 = require("@nestjs/microservices");
const roles_decorator_1 = require("../decorators/roles.decorator");
const jwtAuth_guard_1 = require("../guard/jwtAuth.guard");
const role_guard_1 = require("../guard/role.guard");
const user_decorator_1 = require("../decorators/user.decorator");
let CustomerController = class CustomerController {
    customerService;
    constructor(customerService) {
        this.customerService = customerService;
    }
    async getUserProfile(id) {
        const user = await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'getUserById' }, { id }));
        return user;
    }
    async getVipRemainingDays(id) {
        return await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'getVipRemainingDays' }, { id }));
    }
    async getUserById(idUser, roles) {
        try {
            const roleArray = Array.isArray(roles) ? roles : [roles];
            const user = await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'getUserById' }, {
                id: idUser,
                role: roleArray
            }));
            if (!user) {
                throw new common_1.NotFoundException('Không tìm thấy người dùng');
            }
            return user;
        }
        catch (error) {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            throw new common_1.InternalServerErrorException('Có lỗi xảy ra khi xử lý yêu cầu');
        }
    }
    async hasRole(id, role) {
        if (!role) {
            return {
                statusCode: common_1.HttpStatus.BAD_REQUEST,
                message: 'Thiếu tham số role',
            };
        }
        const result = await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'check_user_role' }, { userId: id, role }));
        return {
            message: `Kiểm tra role ${role} cho user ${id}`,
            data: result,
        };
    }
    async deleteUserById(id) {
        const user = await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'deleteUserById' }, { id }));
        return user;
    }
    async updateMyProfile(id, body) {
        console.log('CustomerController.updateMyProfile id:', id, 'body:', body);
        return await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'updateUser' }, { id, updateData: body }));
    }
    async updateUser(id, body, requesterRole, requesterId) {
        try {
            const targetUser = await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'getUserById' }, { id, role: requesterRole }));
            if (!targetUser) {
                throw new common_1.NotFoundException('User not found');
            }
            const roles = Array.isArray(requesterRole) ? requesterRole : [requesterRole];
            const isStaff = roles.includes(roles_decorator_1.Role.STAFF);
            const isAdmin = roles.includes(roles_decorator_1.Role.ADMIN);
            const targetRoles = Array.isArray(targetUser.role) ? targetUser.role : [targetUser.role];
            const isTargetAdmin = targetRoles.includes(roles_decorator_1.Role.ADMIN);
            if (isStaff && !isAdmin && isTargetAdmin) {
                throw new common_1.ForbiddenException('Staff cannot update Admin account');
            }
            if (isAdmin && isTargetAdmin && id !== requesterId) {
                throw new common_1.ForbiddenException('Admin chỉ được sửa đổi thông tin của chính mình');
            }
            return await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'updateUser' }, { id, updateData: body }));
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException || error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw error;
        }
    }
    async updateUserStatus(id, status) {
        const user = await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'updateUserStatus' }, { id, status }));
        return user;
    }
    async getAllUsers(page, limit, search, status, role, sort_field, sort_order, fullname, username, email_address, reward_point, phone_number, is_active) {
        if (is_active !== undefined) {
            status = is_active === 'true' ? 'active' : 'deactive';
        }
        const dto = {
            page,
            limit,
            search,
            status,
            role,
            sort_field,
            sort_order,
            fullname,
            username,
            email_address,
            reward_point,
            phone_number,
        };
        return await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'getAllUsers' }, dto));
    }
    async addRoleToUser(id, role) {
        const result = await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'add_user_role' }, { userId: id, role }));
        return {
            message: `Đã thêm role "${role}" cho user ${id}`,
            data: result,
        };
    }
    async removeRoleFromUser(id, role) {
        const result = await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'remove_user_role' }, { userId: id, role }));
        return {
            message: `Đã xóa role "${role}" khỏi user ${id}`,
            data: result,
        };
    }
    async totalDetailAccount() {
        const result = await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'total-detail-account' }, {}));
        return {
            message: `Lấy tổng chi tiết user thành công`,
            data: result,
        };
    }
    async updateUserProfile(id, updateData) {
        const result = await (0, rxjs_1.lastValueFrom)(this.customerService.send({ cmd: 'updateUserProfile' }, { userId: id, data: updateData }));
        return {
            message: 'Cập nhật hồ sơ thành công',
            data: result,
        };
    }
};
exports.CustomerController = CustomerController;
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('/profile'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "getUserProfile", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('/profile/vip-remaining-days'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "getVipRemainingDays", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF, roles_decorator_1.Role.CLINIC),
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "getUserById", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN),
    (0, common_1.Get)(':id/has-role'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "hasRole", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "deleteUserById", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('profile'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.UserToken)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.UserToken)('role')),
    __param(3, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "updateUser", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.Patch)(':id/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "updateUserStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(15), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('role')),
    __param(5, (0, common_1.Query)('sort_field')),
    __param(6, (0, common_1.Query)('sort_order')),
    __param(7, (0, common_1.Query)('fullname')),
    __param(8, (0, common_1.Query)('username')),
    __param(9, (0, common_1.Query)('email_address')),
    __param(10, (0, common_1.Query)('reward_point', new common_1.ParseIntPipe({ optional: true }))),
    __param(11, (0, common_1.Query)('phone_number')),
    __param(12, (0, common_1.Query)('is_active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String, String, String, String, String, Number, String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN),
    (0, common_1.Patch)(':id/add-role'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "addRoleToUser", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN),
    (0, common_1.Patch)(':id/remove-role'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "removeRoleFromUser", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN),
    (0, common_1.Get)('total/detail'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "totalDetailAccount", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.USER, roles_decorator_1.Role.STAFF, roles_decorator_1.Role.VET, roles_decorator_1.Role.CLINIC),
    (0, common_1.Patch)(':id/profile'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "updateUserProfile", null);
exports.CustomerController = CustomerController = __decorate([
    (0, common_1.Controller)('api/v1/customer'),
    __param(0, (0, common_1.Inject)('CUSTOMER_SERVICE')),
    __metadata("design:paramtypes", [microservices_1.ClientProxy])
], CustomerController);
//# sourceMappingURL=customer.controller.js.map