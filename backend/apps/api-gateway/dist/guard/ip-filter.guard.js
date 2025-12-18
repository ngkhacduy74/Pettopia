"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpFilterGuard = void 0;
const common_1 = require("@nestjs/common");
let IpFilterGuard = class IpFilterGuard {
    blacklistedIps = process.env.BLACKLISTED_IPS?.split(',').filter(ip => ip.trim()) || [];
    whitelistedIps = process.env.WHITELISTED_IPS?.split(',').filter(ip => ip.trim()) || [];
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const clientIp = this.getClientIp(request);
        if (this.whitelistedIps.length > 0) {
            if (!this.whitelistedIps.includes(clientIp)) {
                throw new common_1.ForbiddenException('Access denied from your IP address');
            }
            return true;
        }
        if (this.blacklistedIps.includes(clientIp)) {
            throw new common_1.ForbiddenException('Your IP address has been blocked');
        }
        return true;
    }
    getClientIp(request) {
        return (request.headers['x-forwarded-for']?.split(',')[0] ||
            request.headers['x-real-ip'] ||
            request.socket.remoteAddress ||
            '');
    }
};
exports.IpFilterGuard = IpFilterGuard;
exports.IpFilterGuard = IpFilterGuard = __decorate([
    (0, common_1.Injectable)()
], IpFilterGuard);
//# sourceMappingURL=ip-filter.guard.js.map