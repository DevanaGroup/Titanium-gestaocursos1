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
Object.defineProperty(exports, "__esModule", { value: true });
exports.zapiService = exports.ZApiService = void 0;
const functions = __importStar(require("firebase-functions"));
class ZApiService {
    constructor() {
        var _a, _b, _c;
        // Configuração a partir das variáveis de ambiente do Firebase
        this.config = {
            instanceId: ((_a = functions.config().zapi) === null || _a === void 0 ? void 0 : _a.instance_id) || '',
            token: ((_b = functions.config().zapi) === null || _b === void 0 ? void 0 : _b.token) || '',
            clientToken: ((_c = functions.config().zapi) === null || _c === void 0 ? void 0 : _c.client_token) || '',
            baseUrl: 'https://api.z-api.io'
        };
        if (!this.config.instanceId || !this.config.token || !this.config.clientToken) {
            throw new Error('Configuração Z-API incompleta. Verifique as variáveis de ambiente.');
        }
    }
    /**
     * Envia uma mensagem de texto via Z-API
     */
    async sendText(request) {
        const url = `${this.config.baseUrl}/instances/${this.config.instanceId}/token/${this.config.token}/send-text`;
        const headers = {
            'Content-Type': 'application/json',
            'Client-Token': this.config.clientToken
        };
        const body = Object.assign(Object.assign({ phone: request.phone, message: request.message }, (request.delayMessage && { delayMessage: request.delayMessage })), (request.delayTyping && { delayTyping: request.delayTyping }));
        functions.logger.info('🚀 Enviando mensagem via Z-API', {
            phone: request.phone,
            messageLength: request.message.length,
            url
        });
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Z-API Error ${response.status}: ${errorText}`);
            }
            const result = await response.json();
            functions.logger.info('✅ Mensagem enviada com sucesso', {
                zaapId: result.zaapId,
                messageId: result.messageId
            });
            return result;
        }
        catch (error) {
            functions.logger.error('❌ Erro ao enviar mensagem via Z-API', error);
            throw error;
        }
    }
    /**
     * Formata número de telefone para o padrão Z-API
     */
    formatPhoneNumber(phone) {
        // Remove todos os caracteres não numéricos
        const cleanPhone = phone.replace(/\D/g, '');
        // Se não começar com 55 (Brasil), adiciona
        if (!cleanPhone.startsWith('55')) {
            return `55${cleanPhone}`;
        }
        return cleanPhone;
    }
    /**
     * Valida se o webhook payload é uma mensagem recebida válida
     */
    isValidReceivedMessage(payload) {
        var _a;
        return (payload.type === 'ReceivedCallback' &&
            !payload.fromMe &&
            payload.status === 'RECEIVED' &&
            !payload.isGroup &&
            !payload.isNewsletter &&
            Boolean((_a = payload.text) === null || _a === void 0 ? void 0 : _a.message) &&
            Boolean(payload.phone));
    }
    /**
     * Extrai informações essenciais do webhook payload
     */
    extractMessageInfo(payload) {
        return {
            phone: payload.phone,
            message: payload.text.message,
            senderName: payload.senderName || payload.chatName,
            messageId: payload.messageId,
            timestamp: new Date(payload.momment),
            instanceId: payload.instanceId
        };
    }
}
exports.ZApiService = ZApiService;
// Instância singleton
exports.zapiService = new ZApiService();
//# sourceMappingURL=zapiService.js.map