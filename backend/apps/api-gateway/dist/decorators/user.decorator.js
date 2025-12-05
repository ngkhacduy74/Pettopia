"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserToken = void 0;
const common_1 = require("@nestjs/common");
exports.UserToken = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!data)
        return user;
    return data.split('.').reduce((obj, key) => {
        return obj && typeof obj === 'object' ? obj[key] : undefined;
    }, user);
});
//# sourceMappingURL=user.decorator.js.map