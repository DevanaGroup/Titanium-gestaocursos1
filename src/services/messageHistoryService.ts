import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const MESSAGES_COLLECTION = 'messages-history';
const WEBHOOK_URL = 'https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24';

export interface MessageContent {
  content: string;
  role: 'assistant' | 'user';
}

export interface ConversationDocument {
  id?: string;
  userId: string;
  thread: string;
  agentId: string;
  created_at: Date;
  messages: MessageContent[];
  dynamicData?: any;
}

export interface MessageHistory {
  id?: string;
  userId: string;
  message: string;
  role: 'assistant' | 'user';
  createdAt: string;
  thread: string;
  agentId: string;
}

export interface ConversationThread {
  thread: string;
  lastMessage: string;
  lastMessageAt: Date;
  messageCount: number;
  preview: string;
}

class MessageHistoryService {
  // Gerar um ID único para thread
  generateThreadId(): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    return `thread_${timestamp}_${randomString}`;
  }

  // Enviar webhook para n8n
  private async sendWebhook(messageData: any): Promise<void> {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Webhook enviado com sucesso para n8n');
    } catch (error) {
      console.error('❌ Erro ao enviar webhook:', error);
      // Não fazer throw do erro para não interromper o fluxo normal
    }
  }

  // Salvar mensagem no histórico (nova estrutura)
  async saveMessage(messageData: {
    userId: string;
    message: string;
    role: 'assistant' | 'user';
    thread: string;
    agentId: string;
    dynamicData?: any;
  }): Promise<void> {
    try {
      const conversationRef = doc(db, MESSAGES_COLLECTION, messageData.thread);
      const conversationDoc = await getDoc(conversationRef);

      const newMessage: MessageContent = {
        content: messageData.message,
        role: messageData.role
      };

      if (conversationDoc.exists()) {
        // Atualizar conversa existente
        await updateDoc(conversationRef, {
          messages: arrayUnion(newMessage)
        });
      } else {
        // Criar nova conversa
        const conversationData: ConversationDocument = {
          userId: messageData.userId,
          thread: messageData.thread,
          agentId: messageData.agentId,
          created_at: new Date(),
          messages: [newMessage],
          dynamicData: messageData.dynamicData || null
        };

        await setDoc(conversationRef, {
          ...conversationData,
          created_at: serverTimestamp()
        });
      }
      
      console.log('✅ Mensagem salva no histórico:', messageData.thread);

      // Buscar documento atualizado para enviar webhook
      const updatedDoc = await getDoc(conversationRef);
      if (updatedDoc.exists()) {
        const webhookData = {
          ...updatedDoc.data(),
          created_at: new Date().toISOString()
        };
        await this.sendWebhook(webhookData);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  // Buscar mensagens de uma thread específica
  async getThreadMessages(threadId: string): Promise<MessageHistory[]> {
    try {
      const conversationRef = doc(db, MESSAGES_COLLECTION, threadId);
      const conversationDoc = await getDoc(conversationRef);

      if (!conversationDoc.exists()) {
        return [];
      }

      const data = conversationDoc.data() as ConversationDocument;
      const messages: MessageHistory[] = [];

      data.messages.forEach((msg, index) => {
        messages.push({
          id: `${threadId}_${index}`,
          userId: data.userId,
          message: msg.content,
          role: msg.role,
          createdAt: data.created_at instanceof Date ? data.created_at.toISOString() : (data.created_at as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
          thread: data.thread,
          agentId: data.agentId || ''
        });
      });

      return messages;
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens da thread:', error);
      return [];
    }
  }

  // Buscar threads de conversa do usuário
  async getUserConversationThreads(userId: string, limitCount: number = 10): Promise<ConversationThread[]> {
    try {
      const q = query(
        collection(db, MESSAGES_COLLECTION),
        where('userId', '==', userId),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const threads: ConversationThread[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as ConversationDocument;
        
        if (data.messages && data.messages.length > 0) {
          const lastMessage = data.messages[data.messages.length - 1];
          const preview = lastMessage.content.length > 100 
            ? lastMessage.content.substring(0, 100) + '...' 
            : lastMessage.content;

          threads.push({
            thread: data.thread,
            lastMessage: lastMessage.content,
            lastMessageAt: data.created_at instanceof Date ? data.created_at : (data.created_at as any)?.toDate?.() || new Date(),
            messageCount: data.messages.length,
            preview
          });
        }
      });

      return threads;
    } catch (error) {
      console.error('❌ Erro ao buscar threads do usuário:', error);
      return [];
    }
  }

  // Buscar últimas conversas com preview
  async getRecentConversations(userId: string, limit: number = 5): Promise<ConversationThread[]> {
    return this.getUserConversationThreads(userId, limit);
  }

  // Limpar histórico de uma thread específica
  async clearThread(threadId: string): Promise<void> {
    try {
      const conversationRef = doc(db, MESSAGES_COLLECTION, threadId);
      const conversationDoc = await getDoc(conversationRef);

      if (conversationDoc.exists()) {
        const data = conversationDoc.data() as ConversationDocument;
        console.log(`🗑️ Thread ${threadId} marcada para limpeza (${data.messages?.length || 0} mensagens)`);
        // Para implementar delete completo, seria necessário usar deleteDoc
        // await deleteDoc(conversationRef);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar thread:', error);
      throw error;
    }
  }

  // Contar total de mensagens do usuário
  async getUserMessageCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, MESSAGES_COLLECTION),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      let totalMessages = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data() as ConversationDocument;
        if (data.messages) {
          totalMessages += data.messages.length;
        }
      });

      return totalMessages;
    } catch (error) {
      console.error('❌ Erro ao contar mensagens:', error);
      return 0;
    }
  }
}

export const messageHistoryService = new MessageHistoryService();
export default messageHistoryService; 