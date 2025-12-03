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
exports.PetController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const microservices_1 = require("@nestjs/microservices");
const roles_decorator_1 = require("../decorators/roles.decorator");
const jwtAuth_guard_1 = require("../guard/jwtAuth.guard");
const role_guard_1 = require("../guard/role.guard");
const user_decorator_1 = require("../decorators/user.decorator");
const platform_express_1 = require("@nestjs/platform-express");
let PetController = class PetController {
    petService;
    constructor(petService) {
        this.petService = petService;
    }
    async createPet(file, data, user_id) {
        const fileBufferString = file ? file.buffer.toString('base64') : undefined;
        return await (0, rxjs_1.lastValueFrom)(this.petService.send({ cmd: 'createPet' }, { ...data, user_id, fileBuffer: fileBufferString }));
    }
    async getAllPets() {
        return await (0, rxjs_1.lastValueFrom)(this.petService.send({ cmd: 'getAllPets' }, {}));
    }
    async getPetCount() {
        return await (0, rxjs_1.lastValueFrom)(this.petService.send({ cmd: 'getPetCount' }, {}));
    }
    async getPetById(pet_id) {
        return await (0, rxjs_1.lastValueFrom)(this.petService.send({ cmd: 'getPetById' }, { pet_id }));
    }
    async getMyPets(user_id) {
        return await (0, rxjs_1.lastValueFrom)(this.petService.send({ cmd: 'getPetsByOwner' }, { user_id }));
    }
    async getPetsByOwner(user_id) {
        return await (0, rxjs_1.lastValueFrom)(this.petService.send({ cmd: 'getPetsByOwner' }, { user_id }));
    }
    async updatePet(file, pet_id, updateData) {
        const fileBufferString = file ? file.buffer.toString('base64') : undefined;
        return await (0, rxjs_1.lastValueFrom)(this.petService.send({ cmd: 'updatePet' }, { pet_id, updateData, fileBuffer: fileBufferString }));
    }
    async deletePet(pet_id) {
        return await (0, rxjs_1.lastValueFrom)(this.petService.send({ cmd: 'deletePet' }, { pet_id }));
    }
};
exports.PetController = PetController;
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('/create'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('avatar', {
        limits: { fileSize: 1 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)$/)) {
                return cb(new Error('Only image files are allowed!'), false);
            }
            cb(null, true);
        },
    })),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], PetController.prototype, "createPet", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_1.Role.ADMIN, roles_decorator_1.Role.STAFF),
    (0, common_1.Get)('/all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PetController.prototype, "getAllPets", null);
__decorate([
    (0, common_1.Get)('/count'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PetController.prototype, "getPetCount", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PetController.prototype, "getPetById", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('/my'),
    __param(0, (0, user_decorator_1.UserToken)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PetController.prototype, "getMyPets", null);
__decorate([
    (0, common_1.Get)('/owner/:user_id'),
    __param(0, (0, common_1.Param)('user_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PetController.prototype, "getPetsByOwner", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('/:id'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('avatar', {
        limits: { fileSize: 1 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)$/)) {
                return cb(new Error('Only image files are allowed!'), false);
            }
            cb(null, true);
        },
    })),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PetController.prototype, "updatePet", null);
__decorate([
    (0, common_1.UseGuards)(jwtAuth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PetController.prototype, "deletePet", null);
exports.PetController = PetController = __decorate([
    (0, common_1.Controller)('api/v1/pet'),
    __param(0, (0, common_1.Inject)('PETCARE_SERVICE')),
    __metadata("design:paramtypes", [microservices_1.ClientProxy])
], PetController);
//# sourceMappingURL=petcare.controller.js.map