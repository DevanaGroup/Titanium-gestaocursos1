import { db } from '@/config/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

// Interface para logs de WhatsApp
export interface WhatsAppLog {
  id?: string;
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  messageType: 'task_assignment' | 'task_deadline' | 'meeting_reminder' | 'expense_approval' | 'system_announcement' | 'manual_test' | 'task_rejection';
  messageTitle: string;
  messageContent: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  metadata?: {
    taskId?: string;
    eventId?: string;
    expenseId?: string;
    priority?: string;
    clientName?: string;
    [key: string]: any;
  };
  sentAt: Date;
  createdAt: Date;
  zapiResponse?: any;
}

class WhatsAppLogService {
  private readonly COLLECTION_NAME = 'whatsapp_logs';

  // Registrar tentativa de envio
  async logSendAttempt(logData: Omit<WhatsAppLog, 'id' | 'createdAt' | 'sentAt'>): Promise<string> {
    try {
      const logEntry = {
        ...logData,
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), logEntry);
      
      console.log(`📝 Log WhatsApp registrado: ${docRef.id}`, {
        recipient: logData.recipientName,
        type: logData.messageType,
        status: logData.status
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao registrar log WhatsApp:', error);
      throw error;
    }
  }

  // Buscar logs por colaborador
  async getLogsByRecipient(recipientId: string, limitCount: number = 50): Promise<WhatsAppLog[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('recipientId', '==', recipientId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as WhatsAppLog));
    } catch (error) {
      console.error('❌ Erro ao buscar logs por destinatário:', error);
      return [];
    }
  }

  // Buscar logs por tipo de mensagem
  async getLogsByType(messageType: WhatsAppLog['messageType'], limitCount: number = 100): Promise<WhatsAppLog[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('messageType', '==', messageType),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as WhatsAppLog));
    } catch (error) {
      console.error('❌ Erro ao buscar logs por tipo:', error);
      return [];
    }
  }

  // Buscar logs recentes
  async getRecentLogs(limitCount: number = 100): Promise<WhatsAppLog[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as WhatsAppLog));
    } catch (error) {
      console.error('❌ Erro ao buscar logs recentes:', error);
      return [];
    }
  }

  // Buscar estatísticas
  async getStatistics(): Promise<{
    total: number;
    successful: number;
    failed: number;
    byType: Record<string, number>;
    successRate: number;
  }> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('createdAt', 'desc'),
        limit(1000) // Últimos 1000 registros para estatísticas
      );

      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => doc.data() as WhatsAppLog);

      const total = logs.length;
      const successful = logs.filter(log => log.status === 'success').length;
      const failed = logs.filter(log => log.status === 'failed').length;
      
      const byType = logs.reduce((acc, log) => {
        acc[log.messageType] = (acc[log.messageType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const successRate = total > 0 ? (successful / total) * 100 : 0;

      return {
        total,
        successful,
        failed,
        byType,
        successRate: Math.round(successRate * 100) / 100
      };
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        byType: {},
        successRate: 0
      };
    }
  }

  // Registrar envio bem-sucedido
  async logSuccess(
    recipientId: string,
    recipientName: string,
    recipientPhone: string,
    messageType: WhatsAppLog['messageType'],
    messageTitle: string,
    messageContent: string,
    metadata?: any,
    zapiResponse?: any
  ): Promise<string> {
    return this.logSendAttempt({
      recipientId,
      recipientName,
      recipientPhone,
      messageType,
      messageTitle,
      messageContent,
      status: 'success',
      metadata,
      zapiResponse
    });
  }

  // Registrar envio com falha
  async logFailure(
    recipientId: string,
    recipientName: string,
    recipientPhone: string,
    messageType: WhatsAppLog['messageType'],
    messageTitle: string,
    messageContent: string,
    error: string,
    metadata?: any
  ): Promise<string> {
    return this.logSendAttempt({
      recipientId,
      recipientName,
      recipientPhone,
      messageType,
      messageTitle,
      messageContent,
      status: 'failed',
      error,
      metadata
    });
  }
}

// Instância singleton
export const whatsappLogService = new WhatsAppLogService(); 