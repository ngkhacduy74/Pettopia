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
exports.CommunicationController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const microservices_1 = require("@nestjs/microservices");
const platform_express_1 = require("@nestjs/platform-express");
const jwtAuth_guard_1 = require("../guard/jwtAuth.guard");
const role_guard_1 = require("../guard/role.guard");
const roles_decorator_1 = require("../decorators/roles.decorator");
const user_decorator_1 = require("../decorators/user.decorator");
let CommunicationController = class CommunicationController {
    communicationService;
    constructor(communicationService) {
        this.communicationService = communicationService;
    }
    async createPost(files, data, userId) {
        const fileBuffers = files?.map((f) => f.buffer.toString('base64')) || [];
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'createPost' }, { ...data, files: fileBuffers, user_id: userId }));
    }
    async getAllPosts(user) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'getAllPosts' }, { userId: user?.id, role: user?.role }));
    }
    async getPostById(post_id, userId) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'getPostById' }, { post_id, userId }));
    }
    async getPostsByUserId(user_id, currentUserId, userRole) {
        const roles = Array.isArray(userRole) ? userRole : [userRole];
        const isAdminOrStaff = roles.includes(roles_decorator_1.Role.ADMIN) || roles.includes(roles_decorator_1.Role.STAFF);
        if (!isAdminOrStaff && user_id !== currentUserId) {
            throw new common_1.ForbiddenException('Bạn không có quyền xem bài viết của người dùng khác');
        }
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'getPostsByUserId' }, { user_id }));
    }
    async updatePost(files, post_id, updateData, currentUserId, userRole) {
        const fileBuffers = files?.map((f) => f.buffer.toString('base64')) || [];
        const roles = Array.isArray(userRole) ? userRole : [userRole];
        const isAdminOrStaff = roles.includes(roles_decorator_1.Role.ADMIN) || roles.includes(roles_decorator_1.Role.STAFF);
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'updatePost' }, {
            post_id,
            updateData,
            files: fileBuffers,
            userId: currentUserId,
            role: roles,
            isAdminOrStaff,
        }));
    }
    async deletePost(post_id, currentUserId, userRole) {
        const roles = Array.isArray(userRole) ? userRole : [userRole];
        const isAdminOrStaff = roles.includes(roles_decorator_1.Role.ADMIN) || roles.includes(roles_decorator_1.Role.STAFF);
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'deletePost' }, { post_id, userId: currentUserId, role: roles, isAdminOrStaff }));
    }
    async likePost(post_id, userId) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'likePost' }, { post_id, user_id: userId }));
    }
    async unlikePost(post_id, userId) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'likePost' }, { post_id, user_id: userId }));
    }
    async addComment(post_id, content, userId) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'addComment' }, { post_id, user_id: userId, content }));
    }
    async deleteComment(post_id, comment_id, userId) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'deleteComment' }, { post_id, comment_id, user_id: userId }));
    }
    async reportPost(post_id, reason, userId) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'reportPost' }, { post_id, user_id: userId, reason }));
    }
    async getReportedPosts() {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'getReportedPosts' }, {}));
    }
    async toggleHidePost(post_id, isHidden, staffId) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'toggleHidePost' }, { post_id, isHidden, staff_id: staffId }));
    }
};
exports.CommunicationController = CommunicationController;
__decorate([
    (0, common_1.Post)('/create'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 5, {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)$/)) {
                return cb(new Error('Only image files are allowed!'), false);
            }
            cb(null, true);
        },
    })),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "createPost", null);
__decorate([
    (0, common_1.Get)('/all'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.UserToken)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getAllPosts", null);
__decorate([
    (0, common_1.Get)('/:id'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getPostById", null);
__decorate([
    (0, common_1.Get)('user/:user_id'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.USER, roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('user_id')),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __param(2, (0, user_decorator_1.UserToken)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getPostsByUserId", null);
__decorate([
    (0, common_1.Patch)('/:id'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.USER, roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 5, {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)$/)) {
                return cb(new Error('Only image files are allowed!'), false);
            }
            cb(null, true);
        },
    })),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, user_decorator_1.UserToken)('id')),
    __param(4, (0, user_decorator_1.UserToken)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "updatePost", null);
__decorate([
    (0, common_1.Delete)('/:id'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.USER, roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __param(2, (0, user_decorator_1.UserToken)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "deletePost", null);
__decorate([
    (0, common_1.Post)(':id/like'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "likePost", null);
__decorate([
    (0, common_1.Delete)(':id/like'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "unlikePost", null);
__decorate([
    (0, common_1.Post)(':id/comment'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('content')),
    __param(2, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "addComment", null);
__decorate([
    (0, common_1.Delete)(':id/comment/:comment_id'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('comment_id')),
    __param(2, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Post)(':id/report'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.USER, roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "reportPost", null);
__decorate([
    (0, common_1.Get)('staff/reported'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getReportedPosts", null);
__decorate([
    (0, common_1.Patch)(':id/hide'),
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('isHidden')),
    __param(2, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "toggleHidePost", null);
exports.CommunicationController = CommunicationController = __decorate([
    (0, common_1.Controller)('api/v1/communication'),
    __param(0, (0, common_1.Inject)('COMMUNICATION_SERVICE')),
    __metadata("design:paramtypes", [microservices_1.ClientProxy])
], CommunicationController);
//# sourceMappingURL=communication.controller.js.map