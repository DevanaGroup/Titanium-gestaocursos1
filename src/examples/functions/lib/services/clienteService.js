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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clienteService = exports.ClienteService = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
class ClienteService {
    constructor() {
        // DB será inicializado quando necessário
    }
    getDb() {
        if (!this.db) {
            this.db = admin.firestore();
        }
        return this.db;
    }
    /**
     * Busca cliente por número de telefone
     */
    async findByPhone(phone) {
        try {
            // Formatar telefone (remover caracteres especiais)
            const cleanPhone = this.formatPhoneNumber(phone);
            functions.logger.info('🔍 Buscando cliente por telefone', {
                originalPhone: phone,
                cleanPhone
            });
            // Buscar na coleção de clientes
            const clientesRef = this.getDb().collection('clientes');
            // Buscar por telefone principal exato
            let querySnapshot = await clientesRef
                .where('telefone_principal', '==', cleanPhone)
                .limit(1)
                .get();
            if (querySnapshot.empty) {
                // Tentar buscar sem código do país se não encontrou
                const phoneWithoutCountryCode = cleanPhone.startsWith('55')
                    ? cleanPhone.substring(2)
                    : cleanPhone;
                querySnapshot = await clientesRef
                    .where('telefone_principal', '==', phoneWithoutCountryCode)
                    .limit(1)
                    .get();
            }
            if (querySnapshot.empty) {
                // Tentar buscar com formatação alternativa
                const alternativeFormats = [
                    cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`,
                    cleanPhone.replace(/^55/, ''),
                    cleanPhone.replace(/^(\d{2})(\d{2})/, '$1$2'), // DDD sem separação
                ];
                for (const altPhone of alternativeFormats) {
                    if (altPhone !== cleanPhone) {
                        querySnapshot = await clientesRef
                            .where('telefone_principal', '==', altPhone)
                            .limit(1)
                            .get();
                        if (!querySnapshot.empty)
                            break;
                    }
                }
            }
            if (querySnapshot.empty) {
                functions.logger.info('❌ Cliente não encontrado', { phone: cleanPhone });
                return null;
            }
            const doc = querySnapshot.docs[0];
            const clienteData = doc.data();
            // IMPORTANTE: Remover o campo 'id' dos dados se existir para evitar sobreescrever doc.id
            const _a = clienteData, { id: _ } = _a, dataWithoutId = __rest(_a, ["id"]);
            const cliente = Object.assign({ id: doc.id }, dataWithoutId);
            functions.logger.info('✅ Cliente encontrado', {
                clienteId: cliente.id,
                clienteIdType: typeof cliente.id,
                nome: cliente.nome,
                ativo: cliente.ativo
            });
            return cliente;
        }
        catch (error) {
            functions.logger.error('❌ Erro ao buscar cliente por telefone', error);
            throw error;
        }
    }
    /**
     * Verifica se o cliente está ativo e tem acesso ao sistema
     */
    async isClienteActive(cliente) {
        try {
            // Verificações básicas
            const hasValidPhone = cliente.telefone_principal &&
                cliente.telefone_principal.length >= 10;
            const hasValidEmail = cliente.email &&
                cliente.email.includes('@');
            const isActive = cliente.ativo === true;
            const isValid = Boolean(hasValidPhone && hasValidEmail && isActive);
            functions.logger.info('🔍 Validando acesso do cliente', {
                clienteId: cliente.id,
                hasValidPhone,
                hasValidEmail,
                isActive,
                isValid
            });
            return isValid;
        }
        catch (error) {
            functions.logger.error('❌ Erro ao validar cliente', error);
            return false;
        }
    }
    /**
     * Cria contexto do cliente para o assistente
     */
    createClientContext(cliente) {
        return `
Cliente: ${cliente.nome}
Telefone: ${cliente.telefone_principal}
Email: ${cliente.email || 'Não informado'}
Profissão: ${cliente.profissao || 'Não informado'}
É Psicólogo: ${cliente.psicologo || 'Não informado'}
Data de Nascimento: ${cliente.data_nascimento || 'Não informado'}
Status: ${cliente.ativo ? 'Ativo' : 'Inativo'}
`.trim();
    }
    /**
     * Registra interação do cliente no Firestore
     */
    async logInteraction(clienteId, messageData) {
        try {
            const interactionRef = this.getDb()
                .collection('clientes')
                .doc(clienteId)
                .collection('whatsapp_interactions');
            await interactionRef.add(Object.assign(Object.assign({}, messageData), { createdAt: admin.firestore.FieldValue.serverTimestamp() }));
            functions.logger.info('✅ Interação registrada', {
                clienteId,
                messageLength: messageData.message.length
            });
        }
        catch (error) {
            functions.logger.error('❌ Erro ao registrar interação', error);
            // Não falhar o processo principal por erro de log
        }
    }
    /**
     * Formata número de telefone para busca
     */
    formatPhoneNumber(phone) {
        // Remove todos os caracteres não numéricos
        return phone.replace(/\D/g, '');
    }
    /**
     * Atualiza último acesso do cliente
     */
    async updateLastAccess(clienteId) {
        try {
            await this.getDb().collection('clientes').doc(clienteId).update({
                ultimo_acesso_whatsapp: admin.firestore.FieldValue.serverTimestamp()
            });
            functions.logger.info('✅ Último acesso atualizado', { clienteId });
        }
        catch (error) {
            functions.logger.error('❌ Erro ao atualizar último acesso', error);
            // Não falhar o processo principal
        }
    }
}
exports.ClienteService = ClienteService;
// Instância singleton
exports.clienteService = new ClienteService();
//# sourceMappingURL=clienteService.js.map