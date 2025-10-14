"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicRegisterSchema = exports.Clinic_Register = exports.RegisterStatus = exports.PhoneSchema = exports.Phone = exports.EmailSchema = exports.Email = exports.Representative = exports.AddressSchema = exports.Address = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid = __importStar(require("uuid"));
let Address = class Address {
    city;
    district;
    ward;
    detail;
};
exports.Address = Address;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], Address.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], Address.prototype, "district", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], Address.prototype, "ward", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], Address.prototype, "detail", void 0);
exports.Address = Address = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], Address);
exports.AddressSchema = mongoose_1.SchemaFactory.createForClass(Address);
let Representative = class Representative {
    name;
    identify_number;
    avatar_url;
    responsible_licenses;
    license_issued_date;
};
exports.Representative = Representative;
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        trim: true,
        match: [/^[A-Za-zÀ-ỹ\s]+$/, 'Tên không hợp lệ'],
    }),
    __metadata("design:type", String)
], Representative.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        trim: true,
        unique: true,
        match: [/^[0-9]{9,12}$/, 'CCCD/CMND không hợp lệ'],
    }),
    __metadata("design:type", String)
], Representative.prototype, "identify_number", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: false,
        trim: true,
    }),
    __metadata("design:type", String)
], Representative.prototype, "avatar_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [String],
        required: true,
        validate: [
            (v) => v.length > 0,
            'Phải có ít nhất một giấy phép hành nghề',
        ],
    }),
    __metadata("design:type", Array)
], Representative.prototype, "responsible_licenses", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Date,
        required: false,
        validate: {
            validator: (v) => v <= new Date(),
            message: 'Ngày cấp phép không được lớn hơn ngày hiện tại',
        },
    }),
    __metadata("design:type", Date)
], Representative.prototype, "license_issued_date", void 0);
exports.Representative = Representative = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], Representative);
let Email = class Email {
    email_address;
    verified;
};
exports.Email = Email;
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: [
            /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
            'Email không hợp lệ',
        ],
    }),
    __metadata("design:type", String)
], Email.prototype, "email_address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Email.prototype, "verified", void 0);
exports.Email = Email = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], Email);
exports.EmailSchema = mongoose_1.SchemaFactory.createForClass(Email);
let Phone = class Phone {
    phone_number;
    verified;
};
exports.Phone = Phone;
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        trim: true,
        match: [
            /^(?:\+84|0)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/,
            'Số điện thoại không hợp lệ (chỉ chấp nhận số Việt Nam)',
        ],
    }),
    __metadata("design:type", String)
], Phone.prototype, "phone_number", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Phone.prototype, "verified", void 0);
exports.Phone = Phone = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], Phone);
exports.PhoneSchema = mongoose_1.SchemaFactory.createForClass(Phone);
var RegisterStatus;
(function (RegisterStatus) {
    RegisterStatus["PENDING"] = "pending";
    RegisterStatus["APPROVED"] = "approved";
    RegisterStatus["REJECTED"] = "rejected";
})(RegisterStatus || (exports.RegisterStatus = RegisterStatus = {}));
let Clinic_Register = class Clinic_Register {
    id;
    user_id;
    clinic_name;
    email;
    phone;
    license_number;
    address;
    description;
    logo_url;
    website;
    status;
    representative;
    note;
};
exports.Clinic_Register = Clinic_Register;
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: [true, 'Clinic ID is required'],
        unique: true,
        default: () => uuid.v4(),
        trim: true,
    }),
    __metadata("design:type", String)
], Clinic_Register.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], Clinic_Register.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], Clinic_Register.prototype, "clinic_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.EmailSchema, required: true }),
    __metadata("design:type", Email)
], Clinic_Register.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.PhoneSchema, required: true }),
    __metadata("design:type", Phone)
], Clinic_Register.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], Clinic_Register.prototype, "license_number", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.AddressSchema, required: true }),
    __metadata("design:type", Address)
], Clinic_Register.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, trim: true }),
    __metadata("design:type", String)
], Clinic_Register.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, trim: true }),
    __metadata("design:type", String)
], Clinic_Register.prototype, "logo_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, trim: true }),
    __metadata("design:type", String)
], Clinic_Register.prototype, "website", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: RegisterStatus,
        default: RegisterStatus.PENDING,
    }),
    __metadata("design:type", String)
], Clinic_Register.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Representative, required: true }),
    __metadata("design:type", Representative)
], Clinic_Register.prototype, "representative", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, trim: true }),
    __metadata("design:type", String)
], Clinic_Register.prototype, "note", void 0);
exports.Clinic_Register = Clinic_Register = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: true,
        toJSON: { transform: transformValue },
        toObject: { transform: transformValue },
    })
], Clinic_Register);
function transformValue(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
}
exports.ClinicRegisterSchema = mongoose_1.SchemaFactory.createForClass(Clinic_Register);
//# sourceMappingURL=clinic-register.schema.js.map