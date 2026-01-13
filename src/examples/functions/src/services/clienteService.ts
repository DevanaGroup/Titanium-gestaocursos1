import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export interface Cliente {
  id: string;
  nome: string;
  telefone_principal: string;
  email?: string;
  profissao?: string;
  psicologo?: string;
  data_nascimento?: string;
  ativo: boolean;
}

export class ClienteService {
  private db: admin.firestore.Firestore | undefined;

  constructor() {
    // DB será inicializado quando necessário
  }

  private getDb(): admin.firestore.Firestore {
    if (!this.db) {
      this.db = admin.firestore();
    }
    return this.db;
  }

  /**
   * Busca cliente por número de telefone
   */
  async findByPhone(phone: string): Promise<Cliente | null> {
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
              
            if (!querySnapshot.empty) break;
          }
        }
      }

      if (querySnapshot.empty) {
        functions.logger.info('❌ Cliente não encontrado', { phone: cleanPhone });
        return null;
      }

      const doc = querySnapshot.docs[0];
      const clienteData = doc.data() as Omit<Cliente, 'id'>;
      
      // IMPORTANTE: Remover o campo 'id' dos dados se existir para evitar sobreescrever doc.id
      const { id: _, ...dataWithoutId } = clienteData as any;
      
      const cliente: Cliente = {
        id: doc.id, // ID do documento do Firestore (string válida)
        ...dataWithoutId
      };

      functions.logger.info('✅ Cliente encontrado', { 
        clienteId: cliente.id, 
        clienteIdType: typeof cliente.id,
        nome: cliente.nome,
        ativo: cliente.ativo 
      });

      return cliente;
    } catch (error) {
      functions.logger.error('❌ Erro ao buscar cliente por telefone', error);
      throw error;
    }
  }

  /**
   * Verifica se o cliente está ativo e tem acesso ao sistema
   */
  async isClienteActive(cliente: Cliente): Promise<boolean> {
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
    } catch (error) {
      functions.logger.error('❌ Erro ao validar cliente', error);
      return false;
    }
  }

  /**
   * Cria contexto do cliente para o assistente
   */
  createClientContext(cliente: Cliente): string {
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
  async logInteraction(clienteId: string, messageData: {
    message: string;
    response: string;
    phone: string;
    timestamp: Date;
    assistantData?: any;
  }): Promise<void> {
    try {
      const interactionRef = this.getDb()
        .collection('clientes')
        .doc(clienteId)
        .collection('whatsapp_interactions');

      await interactionRef.add({
        ...messageData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      functions.logger.info('✅ Interação registrada', { 
        clienteId, 
        messageLength: messageData.message.length 
      });
    } catch (error) {
      functions.logger.error('❌ Erro ao registrar interação', error);
      // Não falhar o processo principal por erro de log
    }
  }

  /**
   * Formata número de telefone para busca
   */
  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    return phone.replace(/\D/g, '');
  }

  /**
   * Atualiza último acesso do cliente
   */
  async updateLastAccess(clienteId: string): Promise<void> {
    try {
      await this.getDb().collection('clientes').doc(clienteId).update({
        ultimo_acesso_whatsapp: admin.firestore.FieldValue.serverTimestamp()
      });

      functions.logger.info('✅ Último acesso atualizado', { clienteId });
    } catch (error) {
      functions.logger.error('❌ Erro ao atualizar último acesso', error);
      // Não falhar o processo principal
    }
  }
}

// Instância singleton
export const clienteService = new ClienteService(); 