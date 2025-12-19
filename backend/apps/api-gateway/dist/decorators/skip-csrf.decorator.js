"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipCsrf = void 0;
const common_1 = require("@nestjs/common");
const csrf_guard_1 = require("../guard/csrf.guard");
const SkipCsrf = () => (0, common_1.SetMetadata)(csrf_guard_1.SKIP_CSRF, true);
exports.SkipCsrf = SkipCsrf;
//# sourceMappingURL=skip-csrf.decorator.js.map