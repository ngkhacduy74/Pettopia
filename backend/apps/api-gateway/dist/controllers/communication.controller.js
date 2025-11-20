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
let CommunicationController = class CommunicationController {
    communicationService;
    constructor(communicationService) {
        this.communicationService = communicationService;
    }
    async createPost(files, data) {
        const fileBuffers = files?.map((f) => f.buffer.toString('base64')) || [];
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'createPost' }, { ...data, files: fileBuffers }));
    }
    async getAllPosts() {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'getAllPosts' }, {}));
    }
    async getPostById(post_id) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'getPostById' }, { post_id }));
    }
    async getPostsByUserId(user_id) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'getPostsByUserId' }, { user_id }));
    }
    async updatePost(files, post_id, updateData) {
        const fileBuffers = files?.map((f) => f.buffer.toString('base64')) || [];
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'updatePost' }, { post_id, updateData, files: fileBuffers }));
    }
    async deletePost(post_id) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'deletePost' }, { post_id }));
    }
    async likePost(post_id, user_id) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'likePost' }, { post_id, user_id }));
    }
    async unlikePost(post_id, user_id) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'likePost' }, { post_id, user_id }));
    }
    async addComment(post_id, body) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'addComment' }, { post_id, user_id: body.user_id, content: body.content }));
    }
    async deleteComment(post_id, comment_id, user_id) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'deleteComment' }, { post_id, comment_id, user_id }));
    }
    async reportPost(post_id, user_id, reason) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'reportPost' }, { post_id, user_id, reason }));
    }
    async getReportedPosts() {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'getReportedPosts' }, {}));
    }
    async toggleHidePost(post_id, isHidden, staff_id) {
        return await (0, rxjs_1.lastValueFrom)(this.communicationService.send({ cmd: 'toggleHidePost' }, { post_id, isHidden, staff_id }));
    }
};
exports.CommunicationController = CommunicationController;
__decorate([
    (0, common_1.Post)('/create'),
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "createPost", null);
__decorate([
    (0, common_1.Get)('/all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getAllPosts", null);
__decorate([
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getPostById", null);
__decorate([
    (0, common_1.Get)('user/:user_id'),
    (0, common_1.Get)('user/:user_id'),
    __param(0, (0, common_1.Param)('user_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getPostsByUserId", null);
__decorate([
    (0, common_1.Patch)('/:id'),
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "updatePost", null);
__decorate([
    (0, common_1.Delete)('/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "deletePost", null);
__decorate([
    (0, common_1.Post)(':id/like'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('user_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "likePost", null);
__decorate([
    (0, common_1.Delete)(':id/like'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('user_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "unlikePost", null);
__decorate([
    (0, common_1.Post)(':id/comment'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "addComment", null);
__decorate([
    (0, common_1.Delete)(':id/comment/:comment_id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('comment_id')),
    __param(2, (0, common_1.Body)('user_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Post)(':id/report'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('user_id')),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "reportPost", null);
__decorate([
    (0, common_1.Get)('staff/reported'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getReportedPosts", null);
__decorate([
    (0, common_1.Patch)(':id/hide'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('isHidden')),
    __param(2, (0, common_1.Body)('staff_id')),
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