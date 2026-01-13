import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { AgendaEvent, AgendaEventStatus, TaskPriority, User, AgendaNotificationData, AgendaParticipant } from "./types";
import { sendAgendaNotificationEmail } from "./agendaEmailService";

/**
 * Verifica e envia notificações para eventos da agenda baseado na prioridade e horário
 */
export async function checkAndSendAgendaNotifications(): Promise<void> {
  try {
    logger.info("Iniciando verificação de notificações da agenda...");
    
    // Busca eventos agendados/confirmados para os próximos 2 dias
    const now = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    
    const eventsSnapshot = await admin.firestore()
      .collection('agendaEvents')
      .where('status', 'in', [AgendaEventStatus.Agendado, AgendaEventStatus.Confirmado])
      .where('startDate', '>=', now)
      .where('startDate', '<=', twoDaysFromNow)
      .get();

    if (eventsSnapshot.empty) {
      logger.info("Nenhum evento próximo encontrado.");
      return;
    }

    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate.toDate(),
      endDate: doc.data().endDate.toDate(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as AgendaEvent));

    logger.info(`Encontrados ${events.length} eventos para verificação`);

    // Processa cada evento
    let totalNotifications = 0;
    for (const event of events) {
      const notificationsSent = await processEventNotifications(event);
      totalNotifications += notificationsSent;
    }

    logger.info(`${totalNotifications} notificações de agenda processadas`);

  } catch (error) {
    logger.error("Erro ao verificar notificações da agenda:", error);
    throw error;
  }
}

/**
 * Processa todas as notificações para um evento específico
 */
async function processEventNotifications(event: AgendaEvent): Promise<number> {
  try {
    const now = new Date();
    const eventTime = event.startDate;
    const hoursUntilEvent = Math.ceil((eventTime.getTime() - now.getTime()) / (1000 * 60 * 60));
    const isToday = isSameDay(eventTime, now);
    const isTomorrow = isSameDay(eventTime, getTomorrow(now));

    // Determina se deve enviar notificação baseado na prioridade
    if (!shouldSendNotification(event.priority, hoursUntilEvent, isToday, isTomorrow)) {
      return 0;
    }

    // Verifica se já enviou notificação recentemente para este evento
    if (await wasNotificationSentRecently(event.id, hoursUntilEvent)) {
      return 0;
    }

    // Busca todos os participantes que devem ser notificados
    const participantsToNotify = await getEventParticipants(event);
    
    if (participantsToNotify.length === 0) {
      logger.warn(`Nenhum participante encontrado para o evento ${event.id}`);
      return 0;
    }

    // Envia notificações para todos os participantes
    let notificationsSent = 0;
    for (const participant of participantsToNotify) {
      try {
        const notificationData: AgendaNotificationData = {
          eventId: event.id,
          eventTitle: event.title,
          eventType: event.type,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          ownerId: event.ownerId,
          ownerName: event.ownerName,
          ownerEmail: event.ownerId, // Será substituído pelo email do owner
          participantId: participant.id,
          participantName: participant.name,
          participantEmail: participant.email,
          participantRole: participant.hierarchyLevel,
          clientName: event.clientName,
          priority: event.priority,
          hoursUntilEvent: hoursUntilEvent,
          isToday: isToday,
          isTomorrow: isTomorrow
        };

        // Envia o email
        await sendAgendaNotificationEmail(notificationData);
        notificationsSent++;

        logger.info(`Notificação enviada para ${participant.name} (${participant.email}) - evento ${event.id}`);
        
      } catch (error) {
        logger.error(`Erro ao enviar notificação para ${participant.name}:`, error);
      }
    }

    // Registra que a notificação foi enviada para este evento
    await recordNotificationSent(event.id, hoursUntilEvent);

    return notificationsSent;

  } catch (error) {
    logger.error(`Erro ao processar notificações para evento ${event.id}:`, error);
    return 0;
  }
}

/**
 * Busca todos os participantes que devem ser notificados para um evento
 */
async function getEventParticipants(event: AgendaEvent): Promise<AgendaParticipant[]> {
  const participants: AgendaParticipant[] = [];

  try {
    // Sempre incluir o proprietário do evento
    const ownerData = await getOwnerData(event.ownerId);
    if (ownerData) {
      participants.push({
        id: ownerData.uid,
        name: ownerData.displayName,
        email: ownerData.email,
        hierarchyLevel: ownerData.hierarchyLevel,
        status: 'Confirmado',
        role: 'Organizador'
      });
    }

    // Se tem participantes específicos definidos, incluí-los
    if (event.participants && event.participants.length > 0) {
      participants.push(...event.participants.filter(p => p.notificationPreference !== 'Nenhum'));
    }

    // Se deve notificar todos os colaboradores
    if (event.notifyAllCollaborators) {
      const allCollaborators = await getAllCollaborators();
      for (const collab of allCollaborators) {
        // Evita duplicatas
        if (!participants.find(p => p.id === collab.uid)) {
          participants.push({
            id: collab.uid,
            name: `${collab.firstName} ${collab.lastName}`,
            email: collab.email,
            hierarchyLevel: collab.hierarchyLevel,
            status: 'Convidado',
            role: collab.hierarchyLevel
          });
        }
      }
    }

    // Se deve notificar por hierarquia específica
    if (event.notifyByHierarchy && event.notifyByHierarchy.length > 0) {
      const collaboratorsByHierarchy = await getCollaboratorsByHierarchy(event.notifyByHierarchy);
      for (const collab of collaboratorsByHierarchy) {
        // Evita duplicatas
        if (!participants.find(p => p.id === collab.uid)) {
          participants.push({
            id: collab.uid,
            name: `${collab.firstName} ${collab.lastName}`,
            email: collab.email,
            hierarchyLevel: collab.hierarchyLevel,
            status: 'Convidado',
            role: collab.hierarchyLevel
          });
        }
      }
    }

    // Se tem participantes customizados por ID
    if (event.customParticipants && event.customParticipants.length > 0) {
      const customCollaborators = await getCollaboratorsByIds(event.customParticipants);
      for (const collab of customCollaborators) {
        // Evita duplicatas
        if (!participants.find(p => p.id === collab.uid)) {
          participants.push({
            id: collab.uid,
            name: `${collab.firstName} ${collab.lastName}`,
            email: collab.email,
            hierarchyLevel: collab.hierarchyLevel,
            status: 'Convidado',
            role: collab.hierarchyLevel
          });
        }
      }
    }

    logger.info(`Encontrados ${participants.length} participantes para o evento ${event.id}`);
    return participants;

  } catch (error) {
    logger.error(`Erro ao buscar participantes do evento ${event.id}:`, error);
    return participants; // Retorna pelo menos o owner se houver
  }
}

/**
 * Busca dados do proprietário do evento na coleção users
 */
async function getOwnerData(ownerId: string): Promise<User | null> {
  try {
    // Buscar na coleção users
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(ownerId)
      .get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      return {
        uid: userData?.uid || ownerId,
        email: userData?.email || '',
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        displayName: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.email || 'Usuário',
        hierarchyLevel: userData?.hierarchyLevel || 'Nível 5'
      };
    }

    logger.warn(`Proprietário do evento ${ownerId} não encontrado na coleção users`);
    return null;
  } catch (error) {
    logger.error(`Erro ao buscar dados do proprietário ${ownerId}:`, error);
    return null;
  }
}

/**
 * Busca todos os usuários na coleção users
 */
async function getAllCollaborators(): Promise<any[]> {
  try {
    const snapshot = await admin.firestore()
      .collection('users')
      .get();
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      uid: doc.id // Garantir que o UID está presente
    }));
  } catch (error) {
    logger.error("Erro ao buscar todos os usuários:", error);
    return [];
  }
}

/**
 * Busca usuários por hierarquia na coleção users
 */
async function getCollaboratorsByHierarchy(hierarchies: string[]): Promise<any[]> {
  try {
    const snapshot = await admin.firestore()
      .collection('users')
      .where('hierarchyLevel', 'in', hierarchies)
      .get();
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      uid: doc.id // Garantir que o UID está presente
    }));
  } catch (error) {
    logger.error("Erro ao buscar usuários por hierarquia:", error);
    return [];
  }
}

/**
 * Busca usuários por IDs específicos na coleção users
 */
async function getCollaboratorsByIds(ids: string[]): Promise<any[]> {
  try {
    if (ids.length === 0) return [];
    
    // Firestore limita a 10 itens no 'in', então vamos processar em lotes
    const batches = [];
    for (let i = 0; i < ids.length; i += 10) {
      const batch = ids.slice(i, i + 10);
      batches.push(batch);
    }

    const results: any[] = [];
    for (const batch of batches) {
      const promises = batch.map(id => 
        admin.firestore()
          .collection('users')
          .doc(id)
          .get()
      );
      
      const docs = await Promise.all(promises);
      
      docs.forEach(doc => {
        if (doc.exists) {
          results.push({
            ...doc.data(),
            uid: doc.id // Garantir que o UID está presente
          });
        }
      });
    }
    
    return results;
  } catch (error) {
    logger.error("Erro ao buscar colaboradores por IDs:", error);
    return [];
  }
}

/**
 * Determina se deve enviar notificação baseado na prioridade e tempo até o evento
 */
function shouldSendNotification(priority: TaskPriority, hoursUntilEvent: number, isToday: boolean, isTomorrow: boolean): boolean {
  // Regras baseadas na prioridade
  switch (priority) {
    case TaskPriority.Urgente:
      // Notifica: 24h, 4h, 1h, 30min antes
      return hoursUntilEvent <= 24 && (
        hoursUntilEvent === 24 || 
        hoursUntilEvent === 4 || 
        hoursUntilEvent === 1 ||
        (hoursUntilEvent === 0 && getMinutesUntilEvent(hoursUntilEvent) === 30)
      );
      
    case TaskPriority.Alta:
      // Notifica: 24h, 2h, 30min antes
      return hoursUntilEvent <= 24 && (
        hoursUntilEvent === 24 || 
        hoursUntilEvent === 2 ||
        (hoursUntilEvent === 0 && getMinutesUntilEvent(hoursUntilEvent) === 30)
      );
      
    case TaskPriority.Média:
      // Notifica: 24h, 1h antes
      return hoursUntilEvent <= 24 && (
        hoursUntilEvent === 24 || 
        hoursUntilEvent === 1
      );
      
    case TaskPriority.Baixa:
      // Notifica: apenas 24h antes
      return hoursUntilEvent === 24;
      
    default:
      return false;
  }
}

/**
 * Verifica se uma notificação foi enviada recentemente para evitar spam
 */
async function wasNotificationSentRecently(eventId: string, hoursUntilEvent: number): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const notificationId = `agenda_${eventId}_${hoursUntilEvent}h_${today}`;
    
    const doc = await admin.firestore()
      .collection('notification_logs')
      .doc(notificationId)
      .get();

    return doc.exists;
  } catch (error) {
    logger.error("Erro ao verificar notificação recente:", error);
    return false;
  }
}

/**
 * Registra que uma notificação foi enviada
 */
async function recordNotificationSent(eventId: string, hoursUntilEvent: number): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const notificationId = `agenda_${eventId}_${hoursUntilEvent}h_${today}`;
    
    await admin.firestore()
      .collection('notification_logs')
      .doc(notificationId)
      .set({
        type: 'agenda',
        eventId: eventId,
        hoursUntilEvent: hoursUntilEvent,
        sentAt: new Date(),
        date: today
      });
  } catch (error) {
    logger.error("Erro ao registrar notificação enviada:", error);
  }
}

/**
 * Utilitários para datas
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString();
}

function getTomorrow(date: Date): Date {
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

function getMinutesUntilEvent(hoursUntilEvent: number): number {
  // Esta é uma simplificação - em produção seria melhor calcular minutos precisos
  return hoursUntilEvent * 60;
} 