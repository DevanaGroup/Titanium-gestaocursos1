import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { zapiService, ZApiWebhookPayload } from './services/zapiService';
import { openaiService } from './services/openaiService';
import { clienteService, Cliente } from './services/clienteService';

// Inicializar Firebase Admin
admin.initializeApp();

// Configurar CORS
const corsHandler = cors({ origin: true });

/**
 * Webhook principal para receber mensagens do WhatsApp via Z-API
 */
export const whatsappWebhook = functions.https.onRequest(async (req, res) => {
  // Aplicar CORS
  corsHandler(req, res, async () => {
    try {
      // Verificar método HTTP
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }

      // Verificar se tem body
      if (!req.body) {
        return res.status(400).json({ error: 'Body da requisição é obrigatório' });
      }

      const webhookPayload: ZApiWebhookPayload = req.body;

      functions.logger.info('📨 Webhook recebido', {
        type: webhookPayload.type,
        phone: webhookPayload.phone,
        fromMe: webhookPayload.fromMe,
        status: webhookPayload.status,
        messageId: webhookPayload.messageId
      });

      // Verificar se é uma mensagem válida recebida
      if (!zapiService.isValidReceivedMessage(webhookPayload)) {
        functions.logger.info('⚠️ Mensagem ignorada - não é uma mensagem recebida válida');
        return res.status(200).json({ message: 'Mensagem ignorada' });
      }

      // Extrair informações da mensagem
      const messageInfo = zapiService.extractMessageInfo(webhookPayload);
      
      functions.logger.info('💬 Processando mensagem', {
        phone: messageInfo.phone,
        message: messageInfo.message,
        senderName: messageInfo.senderName
      });

      // Buscar cliente por telefone
      const cliente = await clienteService.findByPhone(messageInfo.phone);
      
      if (!cliente) {
        functions.logger.info('❌ Cliente não encontrado no sistema', { 
          phone: messageInfo.phone 
        });
        
        // Enviar mensagem de acesso negado
        await zapiService.sendText({
          phone: messageInfo.phone,
          message: "Desculpe, você não possui acesso à esta funcionalidade",
          delayTyping: 2
        });
        
        return res.status(200).json({ message: 'Cliente não encontrado' });
      }

      // Verificar se cliente está ativo
      const isActive = await clienteService.isClienteActive(cliente);
      
      if (!isActive) {
        functions.logger.info('❌ Cliente encontrado mas não possui acesso', { 
          clienteId: cliente.id,
          nome: cliente.nome 
        });
        
        // Enviar mensagem de acesso negado
        await zapiService.sendText({
          phone: messageInfo.phone,
          message: "Desculpe, você não possui acesso à esta funcionalidade",
          delayTyping: 2
        });
        
        return res.status(200).json({ message: 'Cliente sem acesso' });
      }

      functions.logger.info('✅ Cliente validado', { 
        clienteId: cliente.id,
        nome: cliente.nome 
      });

      // Criar contexto do cliente para o assistente
      const clientContext = clienteService.createClientContext(cliente);

      // Processar mensagem com OpenAI (passando clienteId para gerenciar thread)
      const assistantResponse = await openaiService.processMessage(
        messageInfo.message,
        clientContext,
        cliente.id
      );

      functions.logger.info('🤖 Resposta do assistente processada', {
        outOfScope: assistantResponse.out_of_scope,
        topic: assistantResponse.psychology_topic,
        course: assistantResponse.identified_course_id
      });

      // Enviar resposta via Z-API
      await zapiService.sendText({
        phone: messageInfo.phone,
        message: assistantResponse.reply,
        delayTyping: 3,
        delayMessage: 1
      });

      // Registrar interação no Firestore
      await clienteService.logInteraction(cliente.id, {
        message: messageInfo.message,
        response: assistantResponse.reply,
        phone: messageInfo.phone,
        timestamp: messageInfo.timestamp,
        assistantData: assistantResponse
      });

      // Atualizar último acesso
      await clienteService.updateLastAccess(cliente.id);

      functions.logger.info('✅ Processamento concluído com sucesso', {
        clienteId: cliente.id,
        messageId: messageInfo.messageId
      });

      return res.status(200).json({ 
        message: 'Processado com sucesso',
        clienteId: cliente.id,
        assistantResponse: {
          topic: assistantResponse.psychology_topic,
          course: assistantResponse.identified_course_id,
          outOfScope: assistantResponse.out_of_scope
        }
      });

    } catch (error) {
      functions.logger.error('❌ Erro no processamento do webhook', error);
      
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Função para teste manual (desenvolvimento)
 */
export const testWhatsappFlow = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { phone, message } = req.body;

      if (!phone || !message) {
        return res.status(400).json({ 
          error: 'Parâmetros "phone" e "message" são obrigatórios' 
        });
      }

      // Simular payload do webhook
      const testPayload: ZApiWebhookPayload = {
        isStatusReply: false,
        senderLid: "test@lid",
        connectedPhone: "554499999999",
        waitingMessage: false,
        isEdit: false,
        isGroup: false,
        isNewsletter: false,
        instanceId: "TEST_INSTANCE",
        messageId: `TEST_${Date.now()}`,
        phone: phone,
        fromMe: false,
        momment: Date.now(),
        status: "RECEIVED",
        chatName: "Test User",
        senderPhoto: "",
        senderName: "Test User",
        participantPhone: null,
        participantLid: null,
        photo: "",
        broadcast: false,
        type: "ReceivedCallback",
        text: {
          message: message
        }
      };

      // Processar usando a mesma lógica do webhook
      const result = await processWhatsappMessage(testPayload);
      
      return res.status(200).json(result);

    } catch (error) {
      functions.logger.error('❌ Erro no teste', error);
      return res.status(500).json({ 
        error: 'Erro no teste',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Função auxiliar para processar mensagem (reutilizável)
 */
async function processWhatsappMessage(payload: ZApiWebhookPayload) {
  const messageInfo = zapiService.extractMessageInfo(payload);
  
  // Buscar e validar cliente
  const cliente = await clienteService.findByPhone(messageInfo.phone);
  
  if (!cliente) {
    return { success: false, message: 'Cliente não encontrado' };
  }

  const isActive = await clienteService.isClienteActive(cliente);
  
  if (!isActive) {
    return { success: false, message: 'Cliente sem acesso' };
  }

  // Processar com assistente
  const clientContext = clienteService.createClientContext(cliente);
  const assistantResponse = await openaiService.processMessage(
    messageInfo.message,
    clientContext,
    cliente.id
  );

  return {
    success: true,
    cliente: {
      id: cliente.id,
      nome: cliente.nome
    },
    message: messageInfo.message,
    response: assistantResponse.reply,
    metadata: {
      topic: assistantResponse.psychology_topic,
      course: assistantResponse.identified_course_id,
      outOfScope: assistantResponse.out_of_scope
    }
  };
}

/**
 * Função para migrar clientes mocados (desenvolvimento)
 */
export const migrateClientes = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Verificar se é uma requisição GET para segurança
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido. Use GET.' });
      }

      const mockClientes = [
        {
          nome: "Dra. Maria Silva Santos",
          telefone_principal: "5511999991234",
          email: "maria.silva@email.com",
          profissao: "Psicóloga Clínica",
          psicologo: "SIM",
          data_nascimento: "1985-03-15",
          ativo: true,
          cpfcnpj: "123.456.789-01",
          crp: "06/123456"
        },
        {
          nome: "João Carlos Mendes", 
          telefone_principal: "5521987654321",
          email: "joao.mendes@gmail.com",
          profissao: "Estudante de Psicologia",
          psicologo: "NÃO",
          data_nascimento: "1990-07-22",
          ativo: true,
          cpfcnpj: "987.654.321-09"
        },
        {
          nome: "Ana Paula Rodrigues",
          telefone_principal: "5531977778888", 
          email: "ana.rodrigues@hotmail.com",
          profissao: "Psicóloga Organizacional",
          psicologo: "SIM",
          data_nascimento: "1982-11-08",
          ativo: true,
          cpfcnpj: "456.789.123-45",
          crp: "04/987654"
        },
        {
          nome: "Roberto Lima Pereira",
          telefone_principal: "5551998887777",
          email: "roberto.pereira@yahoo.com", 
          profissao: "Neuropsicólogo",
          psicologo: "SIM",
          data_nascimento: "1978-05-30",
          ativo: true,
          cpfcnpj: "789.123.456-78",
          crp: "07/456789"
        },
        {
          nome: "Carla Beatriz Oliveira",
          telefone_principal: "5585987651234",
          email: "carla.oliveira@uol.com.br",
          profissao: "Pedagoga",
          psicologo: "NÃO", 
          data_nascimento: "1993-09-18",
          ativo: true,
          cpfcnpj: "321.654.987-12"
        },
        {
          nome: "Dr. Fernando Santos Costa",
          telefone_principal: "5571991234567",
          email: "fernando.costa@gmail.com",
          profissao: "Psicólogo Clínico",
          psicologo: "SIM",
          data_nascimento: "1980-12-03", 
          ativo: true,
          cpfcnpj: "654.321.789-56",
          crp: "03/654321"
        },
        {
          nome: "Vhibyana Ribeiro",
          telefone_principal: "553496532322",
          email: "vhibyana@galvant.com",
          profissao: "Psicóloga Clínica e Terapia Cognitiva",
          psicologo: "SIM",
          data_nascimento: "1992-08-14",
          ativo: true,
          cpfcnpj: "789.456.123-89", 
          crp: "04/789456"
        }
      ];

      const db = admin.firestore();
      const results = [];

      functions.logger.info('🚀 Iniciando migração de clientes', { 
        total: mockClientes.length 
      });

      // Inserir cada cliente
      for (const cliente of mockClientes) {
        const clienteData = {
          nome: cliente.nome,
          telefone_principal: cliente.telefone_principal,
          email: cliente.email,
          profissao: cliente.profissao || 'Não informado',
          psicologo: cliente.psicologo || 'NÃO',
          data_nascimento: cliente.data_nascimento || null,
          ativo: cliente.ativo !== false,
          cpfcnpj: cliente.cpfcnpj || '',
          crp: cliente.crp || '',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Usar um ID único
        const docRef = db.collection('clientes').doc();
        await docRef.set(clienteData);
        
        results.push({
          id: docRef.id,
          nome: cliente.nome,
          telefone: cliente.telefone_principal
        });

        functions.logger.info('✅ Cliente cadastrado', { 
          nome: cliente.nome,
          telefone: cliente.telefone_principal,
          docId: docRef.id
        });
      }

      // Verificar quantos documentos existem agora
      const snapshot = await db.collection('clientes').get();

      functions.logger.info('🎉 Migração concluída', { 
        clientesInseridos: mockClientes.length,
        totalDocumentos: snapshot.size
      });

      return res.status(200).json({
        success: true,
        message: 'Migração concluída com sucesso',
        clientesInseridos: mockClientes.length,
        totalDocumentosNaColecao: snapshot.size,
        clientes: results
      });

    } catch (error) {
      functions.logger.error('❌ Erro na migração de clientes', error);
      
      return res.status(500).json({
        success: false,
        error: 'Erro na migração',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Função para resetar thread de um cliente (desenvolvimento/suporte)
 */
export const resetClientThread = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
      }

      const { clienteId, phone } = req.body;

      if (!clienteId && !phone) {
        return res.status(400).json({ 
          error: 'Parâmetro "clienteId" ou "phone" é obrigatório' 
        });
      }

      let cliente: Cliente | null = null;

      if (clienteId) {
        // Buscar por ID
        const clienteDoc = await admin.firestore().collection('clientes').doc(clienteId).get();
        if (clienteDoc.exists) {
          const clienteData = clienteDoc.data() as Omit<Cliente, 'id'>;
          cliente = { id: clienteDoc.id, ...clienteData };
        }
      } else if (phone) {
        // Buscar por telefone
        cliente = await clienteService.findByPhone(phone);
      }

      if (!cliente) {
        return res.status(404).json({ 
          error: 'Cliente não encontrado',
          searched: { clienteId, phone }
        });
      }

      // Resetar thread
      const newThreadId = await openaiService.resetClientThread(cliente.id);

      functions.logger.info('🔄 Thread resetado via API', { 
        clienteId: cliente.id,
        nome: cliente.nome,
        newThreadId
      });

      return res.status(200).json({
        success: true,
        message: 'Thread resetado com sucesso',
        cliente: {
          id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone_principal
        },
        newThreadId
      });

    } catch (error) {
      functions.logger.error('❌ Erro ao resetar thread', error);
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao resetar thread',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}); 