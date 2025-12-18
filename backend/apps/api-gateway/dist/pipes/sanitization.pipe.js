"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanitizationPipe = void 0;
const common_1 = require("@nestjs/common");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
let SanitizationPipe = class SanitizationPipe {
    async transform(value, metadata) {
        if (!metadata.metatype || !this.toValidate(metadata.metatype)) {
            return value;
        }
        const sanitized = this.sanitizeValue(value);
        const object = (0, class_transformer_1.plainToClass)(metadata.metatype, sanitized);
        const errors = await (0, class_validator_1.validate)(object);
        if (errors.length > 0) {
            throw new common_1.BadRequestException('Validation failed');
        }
        return object;
    }
    toValidate(metatype) {
        const types = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
    }
    sanitizeValue(value) {
        if (typeof value === 'string') {
            return value
                .replace(/['";]/g, '')
                .replace(/--/g, '')
                .replace(/\/\*/g, '')
                .replace(/\*\//g, '')
                .replace(/<script>/gi, '')
                .replace(/<\/script>/gi, '')
                .trim();
        }
        if (typeof value === 'object' && value !== null) {
            const dangerousKeys = [
                '$ne', '$gt', '$gte', '$lt', '$lte',
                '$in', '$nin',
                '$or', '$and', '$not', '$nor',
                '$exists', '$type',
                '$regex', '$where', '$expr',
                '$jsonSchema',
                '$all', '$elemMatch', '$size',
                '$mod', '$text', '$geoWithin',
            ];
            const sanitized = Array.isArray(value) ? [] : {};
            for (const key in value) {
                if (dangerousKeys.includes(key)) {
                    console.warn(`⚠️  [Security] Blocked dangerous MongoDB operator: ${key}`);
                    continue;
                }
                sanitized[key] = this.sanitizeValue(value[key]);
            }
            return sanitized;
        }
        return value;
    }
};
exports.SanitizationPipe = SanitizationPipe;
exports.SanitizationPipe = SanitizationPipe = __decorate([
    (0, common_1.Injectable)()
], SanitizationPipe);
//# sourceMappingURL=sanitization.pipe.js.map