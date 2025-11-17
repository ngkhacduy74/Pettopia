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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const microservices_1 = require("@nestjs/microservices");
let AiController = class AiController {
    billingService;
    constructor(billingService) {
        this.billingService = billingService;
    }
    async createGeminiChatCompletion(data) {
        return await (0, rxjs_1.lastValueFrom)(this.billingService.send({ cmd: 'createGeminiChatCompletion' }, data));
    }
    async getConversationHistory(conversationId, userId) {
        return await (0, rxjs_1.lastValueFrom)(this.billingService.send({ cmd: 'getGeminiConversationHistory' }, { conversationId, userId }));
    }
    async clearConversation(conversationId, userId) {
        return await (0, rxjs_1.lastValueFrom)(this.billingService.send({ cmd: 'clearGeminiConversation' }, { conversationId, userId }));
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Post)('/gemini/chat'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "createGeminiChatCompletion", null);
__decorate([
    (0, common_1.Get)('/gemini/conversation/:conversationId/history'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getConversationHistory", null);
__decorate([
    (0, common_1.Delete)('/gemini/conversation/:conversationId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "clearConversation", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('api/v1/ai'),
    __param(0, (0, common_1.Inject)('BILLING_SERVICE')),
    __metadata("design:paramtypes", [microservices_1.ClientProxy])
], AiController);
//# sourceMappingURL=ai.controller.js.map