/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest, onCall, CallableRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { checkAndSendTaskNotifications } from "./taskNotificationService";
import { processNewTaskCreated } from "./newTaskNotificationService";
import { processTaskTramitation } from "./taskTramitationNotificationService";
import { processTaskRejection } from "./taskRejectionNotificationService";
import { checkAndSendAgendaNotifications } from "./agendaNotificationService";
import { sendEventCreatedNotification } from "./agendaEmailService";
import { checkAndSendFinancialNotifications, sendDailyFinancialReport } from "./financialNotificationService";
import { Task } from "./types";

// Inicializa o Firebase Admin
admin.initializeApp();

/**
 * NOVA FUNCTION: Escuta criação de novas tarefas e envia notificação
 */
export const onTaskCreated = onDocumentCreated({
  document: "tasks/{taskId}",
  region: "us-central1",
  memory: "256MiB"
}, async (event) => {
  logger.info("=== NOVA TAREFA CRIADA ===");
  
  try {
    if (!event.data) {
      logger.warn("Nenhum dado encontrado no evento");
      return;
    }

    const taskData = {
      id: event.params.taskId,
      ...event.data.data()
    } as Task;

    logger.info(`Processando nova tarefa: ${taskData.title}`, {
      taskId: taskData.id,
      assignedTo: taskData.assignedTo,
      priority: taskData.priority
    });

    // Processa e envia notificação
    await processNewTaskCreated(taskData);
    
    logger.info("=== NOTIFICAÇÃO DE NOVA TAREFA ENVIADA ===");
    
  } catch (error) {
    logger.error("=== ERRO AO PROCESSAR NOVA TAREFA ===", error);
    // Não fazer throw para não bloquear a criação da tarefa
  }
});

/**
 * CRON principal - executa a cada 2 horas das 8h às 18h em dias úteis
 * Schedule: "0 8-18/2 * * 1-5" (8h, 10h, 12h, 14h, 16h, 18h)
 */
export const taskNotificationCron = onSchedule({
  schedule: "0 8-18/2 * * 1-5",
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== INICIANDO CRON DE NOTIFICAÇÕES DE TAREFAS ===");
  
  try {
    await checkAndSendTaskNotifications();
    logger.info("=== CRON DE NOTIFICAÇÕES CONCLUÍDO COM SUCESSO ===");
  } catch (error) {
    logger.error("=== ERRO NO CRON DE NOTIFICAÇÕES ===", error);
    throw error;
  }
});

/**
 * CRON para verificação de emergência - executa a cada hora das 7h às 19h
 * Para tarefas urgentes que precisam de notificação mais frequente
 */
export const urgentTaskNotificationCron = onSchedule({
  schedule: "0 7-19 * * 1-6", // Segunda a sábado, de 7h às 19h
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== INICIANDO CRON URGENTE DE NOTIFICAÇÕES ===");
  
  try {
    // Função específica para tarefas urgentes (será implementada se necessário)
    await checkAndSendTaskNotifications();
    logger.info("=== CRON URGENTE DE NOTIFICAÇÕES CONCLUÍDO ===");
  } catch (error) {
    logger.error("=== ERRO NO CRON URGENTE ===", error);
    throw error;
  }
});

/**
 * Função HTTP para teste manual das notificações
 * Pode ser chamada via POST para testar o sistema
 */
export const testTaskNotifications = onRequest({
  memory: "256MiB",
  maxInstances: 1,
  cors: true
}, async (request, response) => {
  // Verifica se é uma requisição POST para segurança
  if (request.method !== "POST") {
    response.status(405).send("Método não permitido. Use POST.");
    return;
  }

  // Adiciona uma verificação simples de segurança (pode ser melhorada)
  const authHeader = request.headers.authorization;
  if (!authHeader || authHeader !== "Bearer test-token-cerrado") {
    response.status(401).send("Não autorizado");
    return;
  }

  try {
    logger.info("=== TESTE MANUAL DE NOTIFICAÇÕES INICIADO ===");
    
    await checkAndSendTaskNotifications();
    
    response.status(200).json({
      success: true,
      message: "Notificações processadas com sucesso",
      timestamp: new Date().toISOString()
    });
    
    logger.info("=== TESTE MANUAL CONCLUÍDO COM SUCESSO ===");
    
  } catch (error) {
    logger.error("=== ERRO NO TESTE MANUAL ===", error);
    
    response.status(500).json({
      success: false,
      message: "Erro ao processar notificações",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Função para limpeza de logs antigos de notificação
 * Executa semanalmente às domingo às 2h da manhã
 */
export const cleanupNotificationLogs = onSchedule({
  schedule: "0 2 * * 0", // Todo domingo às 2h
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== INICIANDO LIMPEZA DE LOGS ===");
  
  try {
    // Remove logs de notificação com mais de 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldLogs = await admin.firestore()
      .collection('notification_logs')
      .where('sentAt', '<', thirtyDaysAgo)
      .limit(500) // Processa em lotes para evitar timeout
      .get();

    if (!oldLogs.empty) {
      const batch = admin.firestore().batch();
      
      oldLogs.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      logger.info(`${oldLogs.size} logs antigos removidos`);
    } else {
      logger.info("Nenhum log antigo encontrado para remoção");
    }
    
    logger.info("=== LIMPEZA DE LOGS CONCLUÍDA ===");
    
  } catch (error) {
    logger.error("=== ERRO NA LIMPEZA DE LOGS ===", error);
    throw error;
  }
});

/**
 * Função para relatório diário de notificações
 * Executa todo dia às 19h
 */
export const dailyNotificationReport = onSchedule({
  schedule: "0 19 * * *", // Todo dia às 19h
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== GERANDO RELATÓRIO DIÁRIO ===");
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Conta notificações enviadas hoje
    const todayLogs = await admin.firestore()
      .collection('notification_logs')
      .where('date', '==', today)
      .get();

    // Agrupa por prioridade
    const stats = {
      total: todayLogs.size,
      byPriority: {
        urgente: 0,
        alta: 0,
        media: 0,
        baixa: 0
      },
      overdue: 0
    };

    // Busca detalhes das tarefas para estatísticas mais precisas
    const taskIds = [...new Set(todayLogs.docs.map(doc => doc.data().taskId))];
    
    if (taskIds.length > 0) {
      const tasksSnapshot = await admin.firestore()
        .collection('tasks')
        .where(admin.firestore.FieldPath.documentId(), 'in', taskIds.slice(0, 10)) // Firestore limita a 10
        .get();

      tasksSnapshot.docs.forEach(doc => {
        const task = doc.data();
        const priority = task.priority?.toLowerCase() || 'baixa';
        if (stats.byPriority[priority as keyof typeof stats.byPriority] !== undefined) {
          stats.byPriority[priority as keyof typeof stats.byPriority]++;
        }
        
        const dueDate = task.dueDate.toDate();
        if (dueDate < new Date()) {
          stats.overdue++;
        }
      });
    }

    // Salva relatório
    await admin.firestore()
      .collection('notification_reports')
      .doc(today)
      .set({
        date: today,
        stats,
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    logger.info(`Relatório diário gerado: ${stats.total} notificações enviadas`, stats);
    
  } catch (error) {
    logger.error("=== ERRO NO RELATÓRIO DIÁRIO ===", error);
  }
});

// Função auxiliar para debug e monitoramento
export const getNotificationStats = onRequest({
  memory: "256MiB",
  maxInstances: 1,
  cors: true
}, async (request, response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Busca estatísticas do dia
    const reportDoc = await admin.firestore()
      .collection('notification_reports')
      .doc(today)
      .get();

    // Busca logs recentes
    const recentLogs = await admin.firestore()
      .collection('notification_logs')
      .orderBy('sentAt', 'desc')
      .limit(10)
      .get();

    const stats = {
      today: reportDoc.exists ? reportDoc.data() : null,
      recentNotifications: recentLogs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate?.()?.toISOString()
      })),
      systemStatus: "online",
      lastCheck: new Date().toISOString()
    };

    response.status(200).json(stats);
    
  } catch (error) {
    logger.error("Erro ao buscar estatísticas:", error);
    response.status(500).json({
      error: "Erro interno do servidor",
      message: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * ========================================
 * FUNÇÕES DA AGENDA
 * ========================================
 */

/**
 * CRON para notificações da agenda - executa a cada 30 minutos das 7h às 20h
 * Para garantir lembretes próximos aos eventos
 */
export const agendaNotificationCron = onSchedule({
  schedule: "*/30 7-20 * * *", // A cada 30 minutos das 7h às 20h
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== INICIANDO CRON DE NOTIFICAÇÕES DA AGENDA ===");
  
  try {
    await checkAndSendAgendaNotifications();
    logger.info("=== CRON DE NOTIFICAÇÕES DA AGENDA CONCLUÍDO ===");
  } catch (error) {
    logger.error("=== ERRO NO CRON DE NOTIFICAÇÕES DA AGENDA ===", error);
    throw error;
  }
});

/**
 * ========================================
 * NOTIFICAÇÕES FINANCEIRAS
 * ========================================
 */

/**
 * CRON para notificações financeiras - executa a cada 2 horas das 8h às 20h
 * Para verificar vencimentos de contas a pagar e receber
 */
export const financialNotificationCron = onSchedule({
  schedule: "0 8-20/2 * * 1-6", // A cada 2 horas das 8h às 20h, segunda a sábado
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== INICIANDO CRON DE NOTIFICAÇÕES FINANCEIRAS ===");
  
  try {
    await checkAndSendFinancialNotifications();
    logger.info("=== CRON DE NOTIFICAÇÕES FINANCEIRAS CONCLUÍDO ===");
  } catch (error) {
    logger.error("=== ERRO NO CRON DE NOTIFICAÇÕES FINANCEIRAS ===", error);
    throw error;
  }
});

/**
 * CRON para notificações financeiras urgentes - executa a cada 2 horas das 7h às 21h
 * Para vencimentos críticos e em atraso
 */
export const urgentFinancialNotificationCron = onSchedule({
  schedule: "0 7-21/2 * * *", // A cada 2 horas das 7h às 21h, todos os dias
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== INICIANDO CRON URGENTE DE NOTIFICAÇÕES FINANCEIRAS ===");
  
  try {
    await checkAndSendFinancialNotifications();
    logger.info("=== CRON URGENTE DE NOTIFICAÇÕES FINANCEIRAS CONCLUÍDO ===");
  } catch (error) {
    logger.error("=== ERRO NO CRON URGENTE DE NOTIFICAÇÕES FINANCEIRAS ===", error);
    throw error;
  }
});

/**
 * Função para relatório diário de vencimentos financeiros
 * Executa todo dia às 8h da manhã
 */
export const dailyFinancialReportCron = onSchedule({
  schedule: "0 8 * * *", // Todo dia às 8h
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== GERANDO RELATÓRIO DIÁRIO FINANCEIRO ===");
  
  try {
    await sendDailyFinancialReport();
    logger.info("=== RELATÓRIO DIÁRIO FINANCEIRO ENVIADO ===");
  } catch (error) {
    logger.error("=== ERRO NO RELATÓRIO DIÁRIO FINANCEIRO ===", error);
    throw error;
  }
});

/**
 * Função HTTP para teste manual das notificações financeiras
 */
export const testFinancialNotifications = onRequest({
  memory: "256MiB",
  maxInstances: 1,
  cors: true
}, async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Método não permitido. Use POST.");
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || authHeader !== "Bearer test-token-cerrado") {
    response.status(401).send("Não autorizado");
    return;
  }

  try {
    logger.info("=== TESTE MANUAL DE NOTIFICAÇÕES FINANCEIRAS INICIADO ===");
    
    await checkAndSendFinancialNotifications();
    
    response.status(200).json({
      success: true,
      message: "Notificações financeiras processadas com sucesso",
      timestamp: new Date().toISOString()
    });
    
    logger.info("=== TESTE MANUAL FINANCEIRO CONCLUÍDO COM SUCESSO ===");
    
  } catch (error) {
    logger.error("=== ERRO NO TESTE MANUAL FINANCEIRO ===", error);
    
    response.status(500).json({
      success: false,
      message: "Erro ao processar notificações financeiras",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Função para limpeza de logs antigos de notificação financeira
 * Executa semanalmente às domingo às 3h da manhã
 */
export const cleanupFinancialNotificationLogs = onSchedule({
  schedule: "0 3 * * 0", // Todo domingo às 3h
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== INICIANDO LIMPEZA DE LOGS FINANCEIROS ===");
  
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldLogs = await admin.firestore()
      .collection('financial_notification_logs')
      .where('sentAt', '<', thirtyDaysAgo)
      .limit(500)
      .get();

    if (!oldLogs.empty) {
      const batch = admin.firestore().batch();
      
      oldLogs.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      logger.info(`${oldLogs.size} logs financeiros antigos removidos`);
    } else {
      logger.info("Nenhum log financeiro antigo encontrado para remoção");
    }
    
    logger.info("=== LIMPEZA DE LOGS FINANCEIROS CONCLUÍDA ===");
    
  } catch (error) {
    logger.error("=== ERRO NA LIMPEZA DE LOGS FINANCEIROS ===", error);
    throw error;
  }
});

/**
 * CRON adicional para eventos urgentes da agenda - executa a cada 15 minutos das 6h às 22h
 * Para eventos com prioridade urgente que precisam de lembretes mais frequentes
 */
export const urgentAgendaNotificationCron = onSchedule({
  schedule: "*/15 6-22 * * *", // A cada 15 minutos das 6h às 22h
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== INICIANDO CRON URGENTE DA AGENDA ===");
  
  try {
    await checkAndSendAgendaNotifications();
    logger.info("=== CRON URGENTE DA AGENDA CONCLUÍDO ===");
  } catch (error) {
    logger.error("=== ERRO NO CRON URGENTE DA AGENDA ===", error);
    throw error;
  }
});

/**
 * Função HTTP para teste manual das notificações da agenda
 */
export const testAgendaNotifications = onRequest({
  memory: "256MiB",
  maxInstances: 1,
  cors: true
}, async (request, response) => {
  // Verifica se é uma requisição POST para segurança
  if (request.method !== "POST") {
    response.status(405).send("Método não permitido. Use POST.");
    return;
  }

  // Verificação de segurança
  const authHeader = request.headers.authorization;
  if (!authHeader || authHeader !== "Bearer test-token-cerrado") {
    response.status(401).send("Não autorizado");
    return;
  }

  try {
    logger.info("=== TESTE MANUAL DE NOTIFICAÇÕES DA AGENDA INICIADO ===");
    
    await checkAndSendAgendaNotifications();
    
    response.status(200).json({
      success: true,
      message: "Notificações da agenda processadas com sucesso",
      timestamp: new Date().toISOString()
    });
    
    logger.info("=== TESTE MANUAL DA AGENDA CONCLUÍDO ===");
    
  } catch (error) {
    logger.error("=== ERRO NO TESTE MANUAL DA AGENDA ===", error);
    
    response.status(500).json({
      success: false,
      message: "Erro ao processar notificações da agenda",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Função para limpeza de logs antigos de notificação
 * Executa semanalmente às domingo às 2h da manhã
 */
export const cleanupNotificationLogsAgenda = onSchedule({
  schedule: "0 2 * * 0", // Todo domingo às 2h
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== INICIANDO LIMPEZA DE LOGS ===");
  
  try {
    // Remove logs de notificação com mais de 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldLogs = await admin.firestore()
      .collection('notification_logs')
      .where('sentAt', '<', thirtyDaysAgo)
      .limit(500) // Processa em lotes para evitar timeout
      .get();

    if (!oldLogs.empty) {
      const batch = admin.firestore().batch();
      
      oldLogs.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      logger.info(`${oldLogs.size} logs antigos removidos`);
    } else {
      logger.info("Nenhum log antigo encontrado para remoção");
    }
    
    logger.info("=== LIMPEZA DE LOGS CONCLUÍDA ===");
    
  } catch (error) {
    logger.error("=== ERRO NA LIMPEZA DE LOGS ===", error);
    throw error;
  }
});

/**
 * Função para relatório diário de notificações
 * Executa todo dia às 19h
 */
export const dailyNotificationReportAgenda = onSchedule({
  schedule: "0 19 * * *", // Todo dia às 19h
  timeZone: "America/Sao_Paulo",
  memory: "256MiB",
  maxInstances: 1
}, async (event) => {
  logger.info("=== GERANDO RELATÓRIO DIÁRIO ===");
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Conta notificações enviadas hoje
    const todayLogs = await admin.firestore()
      .collection('notification_logs')
      .where('date', '==', today)
      .get();

    // Agrupa por prioridade
    const stats = {
      total: todayLogs.size,
      byPriority: {
        urgente: 0,
        alta: 0,
        media: 0,
        baixa: 0
      },
      overdue: 0
    };

    // Busca detalhes das tarefas para estatísticas mais precisas
    const taskIds = [...new Set(todayLogs.docs.map(doc => doc.data().taskId))];
    
    if (taskIds.length > 0) {
      const tasksSnapshot = await admin.firestore()
        .collection('tasks')
        .where(admin.firestore.FieldPath.documentId(), 'in', taskIds.slice(0, 10)) // Firestore limita a 10
        .get();

      tasksSnapshot.docs.forEach(doc => {
        const task = doc.data();
        const priority = task.priority?.toLowerCase() || 'baixa';
        if (stats.byPriority[priority as keyof typeof stats.byPriority] !== undefined) {
          stats.byPriority[priority as keyof typeof stats.byPriority]++;
        }
        
        const dueDate = task.dueDate.toDate();
        if (dueDate < new Date()) {
          stats.overdue++;
        }
      });
    }

    // Salva relatório
    await admin.firestore()
      .collection('notification_reports')
      .doc(today)
      .set({
        date: today,
        stats,
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    logger.info(`Relatório diário gerado: ${stats.total} notificações enviadas`, stats);
    
  } catch (error) {
    logger.error("=== ERRO NO RELATÓRIO DIÁRIO ===", error);
  }
});

// Função auxiliar para debug e monitoramento
export const getNotificationStatsAgenda = onRequest({
  memory: "256MiB",
  maxInstances: 1,
  cors: true
}, async (request, response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Busca estatísticas do dia
    const reportDoc = await admin.firestore()
      .collection('notification_reports')
      .doc(today)
      .get();

    // Busca logs recentes
    const recentLogs = await admin.firestore()
      .collection('notification_logs')
      .orderBy('sentAt', 'desc')
      .limit(10)
      .get();

    const stats = {
      today: reportDoc.exists ? reportDoc.data() : null,
      recentNotifications: recentLogs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate?.()?.toISOString()
      })),
      systemStatus: "online",
      lastCheck: new Date().toISOString()
    };

    response.status(200).json(stats);
    
  } catch (error) {
    logger.error("Erro ao buscar estatísticas:", error);
    response.status(500).json({
      error: "Erro interno do servidor",
      message: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * NOVA FUNCTION: Escuta criação de novos eventos da agenda e configura participantes
 */
export const onAgendaEventCreated = onDocumentCreated({
  document: "agendaEvents/{eventId}",
  region: "us-central1",
  memory: "256MiB"
}, async (event) => {
  logger.info("=== NOVO EVENTO DA AGENDA CRIADO ===");
  
  try {
    if (!event.data) {
      logger.warn("Nenhum dado encontrado no evento da agenda");
      return;
    }

    const eventData = {
      id: event.params.eventId,
      ...event.data.data()
    } as any;

    logger.info(`Processando novo evento: ${eventData.title}`, {
      eventId: eventData.id,
      ownerId: eventData.ownerId,
      type: eventData.type
    });

    // Se o evento tem configurações de notificação mas não tem participantes explícitos, 
    // vamos criar a lista de participantes
    await processEventParticipants(eventData);
    
    logger.info("=== EVENTO DA AGENDA PROCESSADO ===");
    
  } catch (error) {
    logger.error("=== ERRO AO PROCESSAR EVENTO DA AGENDA ===", error);
    // Não fazer throw para não bloquear a criação do evento
  }
});

/**
 * Processa e atualiza a lista de participantes do evento + envia notificações imediatas
 */
async function processEventParticipants(eventData: any): Promise<void> {
  try {
    const participants: any[] = [];
    
    // Sempre incluir o proprietário
    const ownerData = await getEventOwnerData(eventData.ownerId);
    if (ownerData) {
      participants.push({
        id: ownerData.uid,
        name: ownerData.displayName,
        email: ownerData.email,
        hierarchyLevel: ownerData.hierarchyLevel,
        status: 'Confirmado',
        role: 'Organizador',
        notificationPreference: 'Email'
      });
    }

    // Se deve notificar todos os colaboradores
    if (eventData.notifyAllCollaborators) {
      const allCollaborators = await getAllEventCollaborators();
      for (const collab of allCollaborators) {
        if (!participants.find(p => p.id === collab.uid)) {
          participants.push({
            id: collab.uid,
            name: `${collab.firstName} ${collab.lastName}`,
            email: collab.email,
            hierarchyLevel: collab.hierarchyLevel,
            status: 'Convidado',
            role: collab.hierarchyLevel,
            notificationPreference: 'Email'
          });
        }
      }
    }

    // Se deve notificar por hierarquia
    if (eventData.notifyByHierarchy && eventData.notifyByHierarchy.length > 0) {
      const collabsByHierarchy = await getEventCollaboratorsByHierarchy(eventData.notifyByHierarchy);
      for (const collab of collabsByHierarchy) {
        if (!participants.find(p => p.id === collab.uid)) {
          participants.push({
            id: collab.uid,
            name: `${collab.firstName} ${collab.lastName}`,
            email: collab.email,
            hierarchyLevel: collab.hierarchyLevel,
            status: 'Convidado',
            role: collab.hierarchyLevel,
            notificationPreference: 'Email'
          });
        }
      }
    }

    // Se tem participantes customizados
    if (eventData.customParticipants && eventData.customParticipants.length > 0) {
      const customCollabs = await getEventCollaboratorsByIds(eventData.customParticipants);
      for (const collab of customCollabs) {
        if (!participants.find(p => p.id === collab.uid)) {
          participants.push({
            id: collab.uid,
            name: `${collab.firstName} ${collab.lastName}`,
            email: collab.email,
            hierarchyLevel: collab.hierarchyLevel,
            status: 'Convidado',
            role: collab.hierarchyLevel,
            notificationPreference: 'Email'
          });
        }
      }
    }

    // Atualiza o evento com a lista de participantes
    if (participants.length > 0) {
      await admin.firestore()
        .collection('agendaEvents')
        .doc(eventData.id)
        .update({
          participants: participants,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      logger.info(`${participants.length} participantes adicionados ao evento ${eventData.id}`);

      // NOVA FUNCIONALIDADE: Enviar notificações imediatas para todos os participantes
      logger.info(`Enviando notificações imediatas para ${participants.length} participantes`);
      
      let notificationsSent = 0;
      for (const participant of participants) {
        try {
          // Só enviar para quem quer receber notificações
          if (participant.notificationPreference !== 'Nenhum' && participant.email) {
            await sendEventCreatedNotification(eventData, participant);
            notificationsSent++;
            logger.info(`Notificação imediata enviada para ${participant.name} (${participant.email})`);
          }
        } catch (error) {
          logger.error(`Erro ao enviar notificação imediata para ${participant.name}:`, error);
        }
      }

      logger.info(`${notificationsSent} notificações imediatas enviadas com sucesso!`);
    }

  } catch (error) {
    logger.error(`Erro ao processar participantes do evento ${eventData.id}:`, error);
  }
}

/**
 * Funções auxiliares para buscar dados dos colaboradores na coleção unificada
 */
async function getEventOwnerData(ownerId: string): Promise<any> {
  try {
    // Buscar apenas na coleção unificada 'collaborators_unified'
    const collabDoc = await admin.firestore()
      .collection('collaborators_unified')
      .doc(ownerId)
      .get();

    if (collabDoc.exists) {
      const collabData = collabDoc.data();
      return {
        uid: collabData?.uid || ownerId,
        email: collabData?.email || '',
        firstName: collabData?.firstName || '',
        lastName: collabData?.lastName || '',
        displayName: `${collabData?.firstName || ''} ${collabData?.lastName || ''}`.trim() || collabData?.email || 'Usuário',
        hierarchyLevel: collabData?.hierarchyLevel || 'Colaborador'
      };
    }

    logger.warn(`Proprietário do evento ${ownerId} não encontrado na coleção collaborators_unified`);
    return null;
  } catch (error) {
    logger.error(`Erro ao buscar dados do proprietário ${ownerId}:`, error);
    return null;
  }
}

async function getAllEventCollaborators(): Promise<any[]> {
  try {
    const snapshot = await admin.firestore()
      .collection('collaborators_unified')
      .get();
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      uid: doc.id // Garantir que o UID está presente
    }));
  } catch (error) {
    logger.error("Erro ao buscar todos os colaboradores:", error);
    return [];
  }
}

async function getEventCollaboratorsByHierarchy(hierarchies: string[]): Promise<any[]> {
  try {
    const snapshot = await admin.firestore()
      .collection('collaborators_unified')
      .where('hierarchyLevel', 'in', hierarchies)
      .get();
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      uid: doc.id // Garantir que o UID está presente
    }));
  } catch (error) {
    logger.error("Erro ao buscar colaboradores por hierarquia:", error);
    return [];
  }
}

async function getEventCollaboratorsByIds(ids: string[]): Promise<any[]> {
  try {
    if (ids.length === 0) return [];
    
    // Processa em lotes para lidar com a limitação do Firestore
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
 * Função para criar usuário no Firebase Auth (v1)
 * Usado pelos administradores para criar novos colaboradores
 */
export const createUserAuth = functions.https.onRequest(async (request, response) => {
  // Configurar CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  // Verifica se é uma requisição POST
  if (request.method !== 'POST') {
    response.status(405).json({ error: "Método não permitido. Use POST." });
    return;
  }

  try {
    // Verifica o token de autorização
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: "Token de autorização requerido" });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verifica o token do usuário
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // ✅ Verifica se o usuário tem permissão de administrador - COLEÇÃO USERS
    const adminUserDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();
    
    if (!adminUserDoc.exists) {
      response.status(404).json({ error: "Usuário administrador não encontrado na coleção users" });
      return;
    }

    const adminData = adminUserDoc.data();
    const adminHierarchy = adminData?.hierarchyLevel;
    
    // Verifica se tem permissão baseado no nível numérico (Nível 1-3 podem criar usuários)
    if (!adminHierarchy) {
      response.status(403).json({ error: "Sem permissão para criar usuários" });
      return;
    }
    
    // Extrair número do nível (ex: "Nível 1" -> 1)
    const levelMatch = adminHierarchy.match(/\d+/);
    const levelNum = levelMatch ? parseInt(levelMatch[0], 10) : 5;
    
    // Apenas Níveis 1, 2 e 3 podem criar usuários
    if (levelNum > 3) {
      response.status(403).json({ error: "Sem permissão para criar usuários" });
      return;
    }

    // Extrai dados do corpo da requisição
    const { email, password, firstName, lastName, hierarchyLevel } = request.body;

    if (!email || !password || !firstName || !lastName || !hierarchyLevel) {
      response.status(400).json({ error: "Todos os campos são obrigatórios" });
      return;
    }

    // Cria o usuário no Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: `${firstName} ${lastName}`,
      emailVerified: false
    });

    functions.logger.info(`Usuário criado no Auth: ${userRecord.uid}`);

    // Retorna sucesso com o UID do usuário criado
    response.status(200).json({
      success: true,
      uid: userRecord.uid,
      message: "Usuário criado com sucesso no Firebase Auth"
    });

  } catch (error: any) {
    functions.logger.error("Erro ao criar usuário:", error);
    
    // Mapeia erros específicos do Firebase
    if (error.code === 'auth/email-already-exists') {
      response.status(400).json({ error: "Este e-mail já está sendo usado" });
    } else if (error.code === 'auth/invalid-email') {
      response.status(400).json({ error: "E-mail inválido" });
    } else if (error.code === 'auth/weak-password') {
      response.status(400).json({ error: "Senha muito fraca" });
    } else {
      response.status(500).json({ error: "Erro interno do servidor" });
    }
  }
});

/**
 * ========================================
 * TRAMITAÇÃO DE TAREFAS
 * ========================================
 */

/**
 * Função para notificar tramitação de tarefa
 * Chamada quando uma tarefa é tramitada de um usuário para outro
 */
export const notifyTaskTramitation = onCall({
  memory: "256MiB",
  maxInstances: 1
}, async (request: CallableRequest) => {
  try {
    const {
      taskId,
      taskTitle,
      priority,
      fromUserId,
      fromUserName,
      toUserId,
      toUserName,
      toUserEmail,
      richNotes,
      attachments,
      clientName
    } = request.data;

    // Validar dados obrigatórios
    if (!taskId || !taskTitle || !toUserId || !toUserEmail) {
      logger.error("❌ Dados obrigatórios faltando", {
        taskId: !!taskId,
        taskTitle: !!taskTitle,
        toUserId: !!toUserId,
        toUserEmail: !!toUserEmail
      });
      
      throw new Error("Dados obrigatórios não fornecidos");
    }

    logger.info("=== PROCESSANDO TRAMITAÇÃO DE TAREFA ===", {
      taskId,
      fromUser: fromUserName,
      toUser: toUserName,
      toEmail: toUserEmail,
      hasNotes: !!richNotes,
      hasAttachments: !!attachments && attachments.length > 0
    });

    logger.info("Processando tramitação de tarefa: " + taskTitle, {
      taskId,
      priority: priority || 'Média',
      fromUserId,
      toUserId
    });

    // Processa a tramitação e envia notificação
    await processTaskTramitation(
      taskId,
      taskTitle,
      priority || 'Média',
      fromUserId || 'system',
      fromUserName || 'Sistema',
      toUserId,
      toUserName,
      toUserEmail,
      richNotes || '',
      attachments || [],
      clientName
    );

    logger.info("Email de tramitação adicionado à fila para " + toUserEmail, {
      taskId,
      fromUser: fromUserName,
      toUser: toUserName,
      priority: priority || 'Média'
    });

    return {
      success: true,
      message: "Notificação de tramitação enviada com sucesso",
      taskId,
      recipient: toUserEmail,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error("=== ERRO AO PROCESSAR TRAMITAÇÃO ===", error);
    throw new Error(error instanceof Error ? error.message : "Erro desconhecido");
  }
});

/**
 * Função para notificar rejeição de tarefa
 */
export const sendTaskRejectionAlert = onCall(
  { 
    enforceAppCheck: false,
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      console.log('🔥 Iniciando notificação de rejeição...');
      const data = request.data;
      
      console.log('📋 Dados recebidos:', JSON.stringify(data, null, 2));
      
      // Validação básica dos dados
      if (!data?.toUserEmail || !data?.taskTitle) {
        console.error('❌ Dados inválidos para notificação de rejeição');
        return { 
          success: false, 
          error: 'Email do destinatário e título da tarefa são obrigatórios' 
        };
      }
      
      await processTaskRejection(
        data.taskId,
        data.taskTitle,
        data.priority,
        data.fromUserId,
        data.fromUserName,
        data.fromUserEmail || '',
        data.toUserId,
        data.toUserName,
        data.toUserEmail,
        data.rejectionReason,
        data.clientName
      );
      
      console.log('✅ Email de rejeição enviado com sucesso!');
      return { success: true, message: 'Notificação de rejeição enviada' };
          } catch (error) {
        console.error('❌ Erro na função de notificação de rejeição:', error);
        return { 
          success: false, 
          error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido') 
        };
      }
  }
);
