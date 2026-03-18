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
import { onRequest, onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { checkAndSendTaskNotifications } from "./taskNotificationService";
import { processNewTaskCreated } from "./newTaskNotificationService";
import { processTaskTramitation } from "./taskTramitationNotificationService";
import { processTaskRejection } from "./taskRejectionNotificationService";
import { checkAndSendAgendaNotifications } from "./agendaNotificationService";
import { sendEventCreatedNotification } from "./agendaEmailService";
import { checkAndSendFinancialNotifications, sendDailyFinancialReport } from "./financialNotificationService";
import { Task } from "./types";
import cors from "cors";

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
 * Função para criar usuário no Firebase Auth (1st Gen + CORS explícito)
 * Usado pelos administradores para criar novos colaboradores.
 * Headers CORS são adicionados explicitamente para garantir suporte ao preflight OPTIONS.
 */
export const createUserAuth = functions.https.onRequest((request, response) => {
  // Adiciona headers CORS em TODAS as respostas (inclusive preflight)
  const allowedOrigins = [
    "http://localhost:8080",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:3000",
    "https://titanium-cursos.web.app",
    "https://titanium-cursos.firebaseapp.com",
  ];

  const origin = request.headers.origin || "";
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[4];

  response.set("Access-Control-Allow-Origin", corsOrigin);
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.set("Access-Control-Max-Age", "3600");

  // Responde imediatamente ao preflight (OPTIONS)
  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  void (async () => {
      if (request.method !== "POST") {
        response.status(405).json({ error: "Método não permitido. Use POST." });
        return;
      }
      try {
    functions.logger.info("Iniciando criação de usuário", {
      method: request.method,
      hasBody: !!request.body
    });
    
    // Verifica o token de autorização
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      functions.logger.warn("Token de autorização não fornecido");
      response.status(401).json({ error: "Token de autorização requerido" });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verifica o token do usuário
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
      functions.logger.info("Token verificado com sucesso", { uid: decodedToken.uid });
    } catch (tokenError: any) {
      functions.logger.error("Erro ao verificar token:", tokenError);
      response.status(401).json({ 
        error: "Token inválido ou expirado",
        code: tokenError.code 
      });
      return;
    }
    
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
    
    functions.logger.info("Verificando permissões do administrador", {
      uid: decodedToken.uid,
      hierarchyLevel: adminHierarchy
    });
    
    // Verifica se tem permissão baseado no nível numérico (Nível 1-3 podem criar usuários)
    if (!adminHierarchy) {
      functions.logger.warn("Usuário sem nível hierárquico definido");
      response.status(403).json({ error: "Sem permissão para criar usuários - nível hierárquico não definido" });
      return;
    }
    
    // Extrair número do nível (ex: "Nível 1" -> 1)
    const levelMatch = adminHierarchy.match(/\d+/);
    const levelNum = levelMatch ? parseInt(levelMatch[0], 10) : 5;
    
    functions.logger.info("Nível hierárquico do administrador", {
      hierarchyLevel: adminHierarchy,
      levelNum: levelNum
    });
    
    // Apenas Níveis 1, 2 e 3 podem criar usuários
    if (levelNum > 3) {
      functions.logger.warn("Usuário sem permissão para criar outros usuários", {
        levelNum: levelNum
      });
      response.status(403).json({ 
        error: `Sem permissão para criar usuários. Seu nível (${adminHierarchy}) não permite esta ação. Apenas Níveis 1, 2 e 3 podem criar usuários.`,
        userLevel: adminHierarchy
      });
      return;
    }

    // Extrai dados do corpo da requisição
    const { email, password, firstName, lastName, hierarchyLevel } = request.body;
    
    functions.logger.info("Dados recebidos:", {
      email: email ? `${email.substring(0, 3)}***` : 'não fornecido',
      hasPassword: !!password,
      firstName,
      lastName,
      hierarchyLevel
    });

    if (!email || !password || !firstName || !lastName || !hierarchyLevel) {
      functions.logger.warn("Campos obrigatórios faltando", {
        hasEmail: !!email,
        hasPassword: !!password,
        hasFirstName: !!firstName,
        hasLastName: !!lastName,
        hasHierarchyLevel: !!hierarchyLevel
      });
      response.status(400).json({ error: "Todos os campos são obrigatórios" });
      return;
    }

    // Valida formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      functions.logger.warn("Email inválido:", email);
      response.status(400).json({ error: "Formato de e-mail inválido" });
      return;
    }

    // Valida senha
    if (password.length < 6) {
      functions.logger.warn("Senha muito curta", { length: password.length });
      response.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
      return;
    }

    // Valida nível hierárquico
    const validLevels = ["Nível 1", "Nível 2", "Nível 3", "Nível 4", "Nível 5", "Nível 6"];
    if (!validLevels.includes(hierarchyLevel)) {
      functions.logger.warn("Nível hierárquico inválido", { hierarchyLevel });
      response.status(400).json({ 
        error: `Nível hierárquico inválido: ${hierarchyLevel}. Níveis válidos: ${validLevels.join(", ")}` 
      });
      return;
    }

    // Verifica se o administrador pode criar o nível solicitado
    const targetLevelMatch = hierarchyLevel.match(/\d+/);
    const targetLevelNum = targetLevelMatch ? parseInt(targetLevelMatch[0], 10) : 5;
    
    // Nível 1 pode criar qualquer nível (incluindo outro Nível 1)
    // Outros níveis só podem criar níveis inferiores
    if (levelNum !== 1 && levelNum >= targetLevelNum) {
      functions.logger.warn("Tentativa de criar nível igual ou superior", {
        adminLevel: levelNum,
        targetLevel: targetLevelNum
      });
      response.status(403).json({ 
        error: `Você não pode criar usuários do nível ${hierarchyLevel}. Apenas níveis inferiores ao seu (${adminHierarchy}) podem ser criados.` 
      });
      return;
    }

    // Cria o usuário no Firebase Auth
    functions.logger.info("Criando usuário no Firebase Auth...", {
      email: email.substring(0, 3) + "***",
      hierarchyLevel,
      adminLevel: adminHierarchy,
      adminLevelNum: levelNum,
      targetLevelNum: targetLevelNum
    });
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: `${firstName} ${lastName}`,
        emailVerified: false
      });
      functions.logger.info(`✅ Usuário criado no Auth: ${userRecord.uid}`, {
        email: email.substring(0, 3) + "***",
        hierarchyLevel,
        uid: userRecord.uid
      });
    } catch (authError: any) {
      functions.logger.error("Erro ao criar usuário no Auth:", {
        code: authError.code,
        message: authError.message,
        email: email.substring(0, 3) + "***",
        stack: authError.stack
      });
      // Retornar erro específico do Auth sem lançar exceção
      if (authError.code === 'auth/email-already-exists') {
        response.status(400).json({ 
          error: "Este e-mail já está sendo usado",
          code: authError.code 
        });
        return;
      } else if (authError.code === 'auth/invalid-email') {
        response.status(400).json({ 
          error: "E-mail inválido",
          code: authError.code 
        });
        return;
      } else if (authError.code === 'auth/weak-password') {
        response.status(400).json({ 
          error: "Senha muito fraca. Use pelo menos 6 caracteres",
          code: authError.code 
        });
        return;
      }
      // Para outros erros de Auth, re-lançar para ser tratado no catch externo
      throw authError;
    }

    // Retorna sucesso com o UID do usuário criado
    functions.logger.info("Retornando resposta de sucesso", {
      uid: userRecord.uid,
      email: email.substring(0, 3) + "***"
    });
    response.status(200).json({
      success: true,
      uid: userRecord.uid,
      message: "Usuário criado com sucesso no Firebase Auth"
    });

  } catch (error: any) {
    functions.logger.error("Erro ao criar usuário:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
      type: typeof error,
      keys: error ? Object.keys(error) : []
    });

    // Verificar se a resposta já foi enviada
    if (response.headersSent) {
      functions.logger.warn("Resposta já foi enviada, não é possível enviar erro");
      return;
    }
    
    // Mapeia erros específicos do Firebase
    if (error.code === 'auth/email-already-exists') {
      response.status(400).json({ 
        error: "Este e-mail já está sendo usado",
        code: error.code 
      });
      return;
    } else if (error.code === 'auth/invalid-email') {
      response.status(400).json({ 
        error: "E-mail inválido",
        code: error.code 
      });
      return;
    } else if (error.code === 'auth/weak-password') {
      response.status(400).json({ 
        error: "Senha muito fraca. Use pelo menos 6 caracteres",
        code: error.code 
      });
      return;
    } else if (error.code === 'auth/operation-not-allowed') {
      response.status(403).json({ 
        error: "Operação não permitida. Verifique as configurações do Firebase",
        code: error.code 
      });
      return;
    } else if (error.code === 'auth/network-request-failed') {
      response.status(503).json({ 
        error: "Erro de rede. Tente novamente mais tarde",
        code: error.code 
      });
      return;
    } else {
      const errorMessage = error?.message || error?.toString() || "Erro interno do servidor";
      functions.logger.error("Erro não mapeado, retornando 500", {
        errorMessage,
        code: error?.code || 'unknown'
      });
      response.status(500).json({
        error: errorMessage,
        code: error?.code || "unknown",
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
      });
      return;
    }
  }
  })().catch((err: any) => {
    if (!response.headersSent) {
      functions.logger.error("createUserAuth unhandled", err);
      response.status(500).json({ error: err?.message || "Erro interno" });
    }
  });
});

/**
 * ========================================
 * HARD DELETE DE USUÁRIO (Professores e Colaboradores)
 * ========================================
 */

/**
 * Função Callable para hard delete de usuário
 * - Deleta da coleção users
 * - Deleta do Firebase Auth
 * - NÃO deleta tarefas relacionadas (preserva histórico)
 */
export const deleteUserPermanently = onCall({
  memory: "256MiB",
  maxInstances: 1
}, async (request: CallableRequest) => {
  if (!request.auth?.uid) {
    throw new Error("Usuário não autenticado");
  }

  const callerUid = request.auth.uid;
  const targetUserId = request.data?.userId as string;

  if (!targetUserId) {
    throw new Error("userId é obrigatório");
  }

  if (callerUid === targetUserId) {
    throw new Error("Você não pode deletar sua própria conta");
  }

  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new Error("Usuário chamador não encontrado");
  }

  const callerData = callerDoc.data();
  const callerLevel = callerData?.hierarchyLevel as string | undefined;

  const getLevelNum = (level: string | undefined): number => {
    const match = level?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 5;
  };

  const callerLevelNum = getLevelNum(callerLevel);
  if (callerLevelNum > 3) {
    throw new Error("Apenas gerentes podem deletar usuários");
  }

  const targetDoc = await admin.firestore().collection("users").doc(targetUserId).get();
  if (!targetDoc.exists) {
    throw new Error("Usuário alvo não encontrado");
  }

  const targetData = targetDoc.data();
  const targetLevel = targetData?.hierarchyLevel as string | undefined;
  const targetLevelNum = getLevelNum(targetLevel);

  if (callerLevel === targetLevel) {
    throw new Error(`Você não pode deletar outro usuário do mesmo nível hierárquico (${callerLevel})`);
  }

  // canManageLevel: Nível 0 e Nível 1 podem deletar qualquer um; outros só níveis inferiores
  if (callerLevelNum >= targetLevelNum && callerLevel !== "Nível 0" && callerLevel !== "Nível 1") {
    throw new Error(`Você não tem permissão para deletar usuários do nível: ${targetLevel}`);
  }

  await admin.firestore().collection("auditLogs").add({
    action: "delete_user",
    performedBy: callerUid,
    performedByName: callerData?.firstName || callerData?.email || callerUid,
    performedOn: targetUserId,
    details: `Usuário ${targetUserId} removido permanentemente por ${callerData?.email || callerUid}`,
    entityType: "collaborator",
    changes: {},
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  await admin.firestore().collection("users").doc(targetUserId).delete();

  await admin.auth().deleteUser(targetUserId);

  return { success: true, message: "Usuário removido permanentemente" };
});

/**
 * Busca usuário em users ou collaborators_unified (projeto pode usar qualquer coleção)
 */
async function getUserDoc(uid: string): Promise<admin.firestore.DocumentSnapshot | null> {
  const usersDoc = await admin.firestore().collection("users").doc(uid).get();
  if (usersDoc.exists) return usersDoc;
  const unifiedDoc = await admin.firestore().collection("collaborators_unified").doc(uid).get();
  if (unifiedDoc.exists) return unifiedDoc;
  // Buscar por firebaseUid/uid em collaborators_unified (doc.id pode ser diferente)
  const byUid = await admin.firestore().collection("collaborators_unified")
    .where("uid", "==", uid).limit(1).get();
  if (!byUid.empty) return byUid.docs[0];
  const byFirebaseUid = await admin.firestore().collection("collaborators_unified")
    .where("firebaseUid", "==", uid).limit(1).get();
  if (!byFirebaseUid.empty) return byFirebaseUid.docs[0];
  return null;
}

/**
 * Resolve o Firebase Auth UID do documento (uid, firebaseUid ou doc.id)
 */
function resolveAuthUid(doc: admin.firestore.DocumentSnapshot): string {
  const d = doc.data();
  return (d?.uid || d?.firebaseUid || doc.id) as string;
}

/**
 * Cria token customizado para permitir que admin faça login como outro usuário (impersonate)
 * Suporta: users, collaborators_unified; roles admin/adminTI/Nível 0-3
 */
const CORS_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:3000",
  "https://titanium-cursos.web.app",
  "https://titanium-cursos.firebaseapp.com"
];

export const createCustomTokenForImpersonation = onCall({
  memory: "256MiB",
  maxInstances: 1,
  cors: CORS_ORIGINS
}, async (request: CallableRequest) => {
  try {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const callerUid = request.auth.uid;
    const targetUserId = (request.data?.targetUserId as string)?.trim();

    if (!targetUserId) {
      throw new HttpsError("invalid-argument", "targetUserId é obrigatório");
    }

    const callerDoc = await getUserDoc(callerUid);
    if (!callerDoc?.exists) {
      throw new HttpsError("not-found", "Usuário chamador não encontrado em users ou collaborators_unified");
    }

    const callerData = callerDoc.data();
    const callerLevel = (callerData?.hierarchyLevel as string) || "";

    const canImpersonate = callerLevel === "Nível 0" || callerLevel === "Nível 1";

    if (!canImpersonate) {
      throw new HttpsError("permission-denied", `Seu nível (${callerLevel}) não permite fazer login como outro usuário. Apenas Nível 0 e Nível 1 podem.`);
    }

    const targetDoc = await getUserDoc(targetUserId);
    if (!targetDoc?.exists) {
      throw new HttpsError("not-found", "Usuário alvo não encontrado em users ou collaborators_unified");
    }

    const targetAuthUid = resolveAuthUid(targetDoc);

    const customToken = await admin.auth().createCustomToken(targetAuthUid);

    await admin.firestore().collection("auditLogs").add({
      action: "impersonate_login",
      performedBy: callerUid,
      performedByName: callerData?.firstName || callerData?.email || callerUid,
      performedOn: targetAuthUid,
      details: `Login como usuário ${targetAuthUid} por ${callerData?.email || callerUid}`,
      entityType: "collaborator",
      changes: {},
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { customToken };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    logger.error("createCustomTokenForImpersonation error", err);
    throw new HttpsError("internal", err?.message || "Erro ao criar token de impersonação");
  }
});

/**
 * Admin define nova senha para um usuário
 * Suporta: users, collaborators_unified; roles admin/adminTI/Nível 0-3
 */
export const updateUserPassword = onCall({
  memory: "256MiB",
  maxInstances: 1,
  cors: CORS_ORIGINS
}, async (request: CallableRequest) => {
  try {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const callerUid = request.auth.uid;
    const targetUserId = (request.data?.targetUserId as string)?.trim();
    const newPassword = (request.data?.newPassword as string)?.trim();

    if (!targetUserId || !newPassword) {
      throw new HttpsError("invalid-argument", "targetUserId e newPassword são obrigatórios");
    }

    if (newPassword.length < 6) {
      throw new HttpsError("invalid-argument", "A senha deve ter pelo menos 6 caracteres");
    }

    const callerDoc = await getUserDoc(callerUid);
    if (!callerDoc?.exists) {
      throw new HttpsError("not-found", "Usuário chamador não encontrado");
    }

    const callerData = callerDoc.data();
    const callerLevel = (callerData?.hierarchyLevel as string) || "";
    const canResetPassword = callerLevel === "Nível 0" || callerLevel === "Nível 1";

    if (!canResetPassword) {
      throw new HttpsError("permission-denied", `Seu nível (${callerLevel}) não permite redefinir senha. Apenas Nível 0 e Nível 1 podem.`);
    }

    const targetDoc = await getUserDoc(targetUserId);
    if (!targetDoc?.exists) {
      throw new HttpsError("not-found", "Usuário alvo não encontrado");
    }

    const targetAuthUid = resolveAuthUid(targetDoc);

    await admin.auth().updateUser(targetAuthUid, { password: newPassword });

    await admin.firestore().collection("auditLogs").add({
      action: "admin_password_reset",
      performedBy: callerUid,
      performedByName: callerData?.firstName || callerData?.email || callerUid,
      performedOn: targetAuthUid,
      details: `Senha redefinida para usuário ${targetAuthUid} por ${callerData?.email || callerUid}`,
      entityType: "collaborator",
      changes: {},
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: "Senha atualizada com sucesso" };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    logger.error("updateUserPassword error", err);
    throw new HttpsError("internal", err?.message || "Erro ao atualizar senha");
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

/**
 * ========================================
 * SOLICITAÇÃO DE AULA VIA LINK EXTERNO (consultores sem acesso ao sistema)
 * ========================================
 */

/** GET: lista de cursos (id, title) para o formulário público de solicitação de aula */
export const getPublicCourses = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Método não permitido. Use GET." });
      return;
    }
    try {
      const snap = await admin.firestore().collection("courses").get();
      const list = snap.docs
        .filter((d) => !d.data()?.deletedAt)
        .map((d) => ({ id: d.id, title: d.data()?.title || "" }));
      res.status(200).json(list);
    } catch (e) {
      logger.error("getPublicCourses error", e);
      res.status(500).json({ error: "Erro ao listar cursos." });
    }
  }
);

/** POST: cria solicitação de aula (grava em lessons com status draft) - link externo para consultores */
export const createLessonRequest = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Método não permitido. Use POST." });
      return;
    }
    try {
      const body = req.body as Record<string, unknown>;
      const required = [
        "email", "requesterName", "consultantName", "courseResponsibleName",
        "courseResponsiblePhone", "courseResponsibleEmail", "lessonDate", "lessonStartTime",
        "locationName", "locationAddress", "needsProfessor", "numberOfStudents",
        "lessonDuration", "needsFolder", "hasHandsOn", "courseId"
      ];
      for (const key of required) {
        if (body[key] === undefined || body[key] === null || String(body[key]).trim() === "") {
          res.status(400).json({ error: `Campo obrigatório ausente ou vazio: ${key}` });
          return;
        }
      }
      const courseId = String(body.courseId).trim();
      const courseSnap = await admin.firestore().collection("courses").doc(courseId).get();
      if (!courseSnap.exists) {
        res.status(400).json({ error: "Curso não encontrado." });
        return;
      }
      // Protocolo único: TIT-YYYYMMDD-XXXX (origem externa)
      const now = new Date();
      const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      const protocol = `TIT-${yyyymmdd}-${rand}`;

      const lessonData: Record<string, unknown> = {
        protocol,
        origin: "Externo",
        email: String(body.email).trim(),
        requesterName: String(body.requesterName).trim(),
        consultantName: String(body.consultantName).trim(),
        courseResponsibleName: String(body.courseResponsibleName).trim(),
        courseResponsiblePhone: String(body.courseResponsiblePhone).trim(),
        courseResponsiblePhoneCountryCode: body.courseResponsiblePhoneCountryCode ?? "BR",
        courseResponsibleEmail: String(body.courseResponsibleEmail).trim(),
        lessonDate: String(body.lessonDate).trim(),
        lessonStartTime: String(body.lessonStartTime).trim(),
        locationName: String(body.locationName).trim(),
        locationAddress: String(body.locationAddress).trim(),
        needsProfessor: String(body.needsProfessor).trim(),
        professorName: body.professorName != null ? String(body.professorName).trim() : "",
        professorId: body.professorId ?? "",
        professorPaymentValue: body.professorPaymentValue != null ? Number(body.professorPaymentValue) : undefined,
        numberOfStudents: String(body.numberOfStudents).trim(),
        lessonDuration: String(body.lessonDuration).trim(),
        customDuration: body.customDuration != null ? String(body.customDuration).trim() : "",
        needsFolder: String(body.needsFolder).trim(),
        hasHandsOn: String(body.hasHandsOn).trim(),
        lessonTheme: body.lessonTheme != null ? String(body.lessonTheme).trim() : "",
        implantModels: Array.isArray(body.implantModels) ? body.implantModels : [],
        courseId,
        status: "draft",
        deletedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const clean = Object.fromEntries(
        Object.entries(lessonData).filter(([, v]) => v !== undefined)
      ) as Record<string, unknown>;
      const ref = await admin.firestore().collection("lessons").add(clean);
      res.status(200).json({
        success: true,
        id: ref.id,
        protocol: protocol as string,
        message: "Solicitação de aula enviada com sucesso.",
      });
    } catch (e) {
      logger.error("createLessonRequest error", e);
      res.status(500).json({ error: "Erro ao registrar solicitação. Tente novamente." });
    }
  }
);
