"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Roles = exports.ROLES_KEY = exports.Role = void 0;
var Role;
(function (Role) {
    Role["USER"] = "User";
    Role["ADMIN"] = "Admin";
    Role["STAFF"] = "Staff";
    Role["VET"] = "Vet";
    Role["CLINIC"] = "Clinic";
})(Role || (exports.Role = Role = {}));
const common_1 = require("@nestjs/common");
exports.ROLES_KEY = 'roles';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
//# sourceMappingURL=roles.decorator.js.map