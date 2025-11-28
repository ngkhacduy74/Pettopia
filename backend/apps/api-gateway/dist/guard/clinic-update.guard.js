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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicUpdateGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
let ClinicUpdateGuard = class ClinicUpdateGuard {
    jwtService;
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = request.headers['token_clinic'];
        const params = request.params;
        if (!token) {
            throw new common_1.UnauthorizedException("Không tìm thấy 'token_clinic' trong header.");
        }
        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET,
            });
            if (payload.type !== 'clinic-update' || payload.sub !== params.id) {
                throw new common_1.UnauthorizedException('Token không hợp lệ cho phòng khám này.');
            }
            request.user = payload;
            return true;
        }
        catch (err) {
            throw new common_1.UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
        }
    }
};
exports.ClinicUpdateGuard = ClinicUpdateGuard;
exports.ClinicUpdateGuard = ClinicUpdateGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], ClinicUpdateGuard);
//# sourceMappingURL=clinic-update.guard.js.map