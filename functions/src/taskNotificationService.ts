import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { Task, TaskStatus, TaskPriority, User, TaskNotificationData } from "./types";
import { sendTaskNotificationEmail } from "./notificationService";

/**
 * Verifica e envia notificações para tarefas baseado na prioridade
 */
export async function checkAndSendTaskNotifications(): Promise<void> {
  try {
    logger.info("Iniciando verificação de notificações de tarefas...");
    
    // Busca todas as tarefas pendentes ou em andamento
    const tasksSnapshot = await admin.firestore()
      .collection('tasks')
      .where('status', 'in', [TaskStatus.Pendente, TaskStatus.EmAndamento])
      .get();

    if (tasksSnapshot.empty) {
      logger.info("Nenhuma tarefa pendente encontrada.");
      return;
    }

    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));

    logger.info(`Encontradas ${tasks.length} tarefas para verificação`);

    // Busca informações dos usuários para obter emails
    const userIds = [...new Set(tasks.map(task => task.assignedTo))];
    const usersData = await getUsersData(userIds);

    // Processa cada tarefa
    const notificationPromises = tasks
      .map(task => processTaskNotification(task, usersData))
      .filter(promise => promise !== null);

    if (notificationPromises.length > 0) {
      await Promise.all(notificationPromises);
      logger.info(`${notificationPromises.length} notificações processadas`);
    } else {
      logger.info("Nenhuma notificação precisa ser enviada no momento");
    }

  } catch (error) {
    logger.error("Erro ao verificar notificações de tarefas:", error);
    throw error;
  }
}

/**
 * Processa uma tarefa individual e determina se deve enviar notificação
 */
async function processTaskNotification(task: Task, usersData: Record<string, User>): Promise<void | null> {
  try {
    const user = usersData[task.assignedTo];
    if (!user || !user.email) {
      logger.warn(`Usuário não encontrado ou sem email para tarefa ${task.id}`);
      return null;
    }

    const dueDate = task.dueDate.toDate();
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDue < 0;

    // Determina se deve enviar notificação baseado na prioridade
    if (!shouldSendNotification(task.priority, daysUntilDue, isOverdue)) {
      return null;
    }

    // Verifica se já enviou notificação recentemente
    if (await wasNotificationSentRecently(task.id, daysUntilDue)) {
      return null;
    }

    const notificationData: TaskNotificationData = {
      taskId: task.id,
      taskTitle: task.title,
      priority: task.priority,
      dueDate: dueDate,
      assignedTo: task.assignedTo,
      assignedToName: task.assignedToName,
      assignedToEmail: user.email,
      clientName: task.clientName,
      daysUntilDue: daysUntilDue,
      isOverdue: isOverdue
    };

    // Envia o email
    await sendTaskNotificationEmail(notificationData);

    // Registra que a notificação foi enviada
    await recordNotificationSent(task.id, daysUntilDue);

    logger.info(`Notificação enviada para tarefa ${task.id} - ${task.title}`);

  } catch (error) {
    logger.error(`Erro ao processar notificação para tarefa ${task.id}:`, error);
  }

  return null;
}

/**
 * Determina se deve enviar notificação baseado na prioridade e prazo
 */
function shouldSendNotification(priority: TaskPriority, daysUntilDue: number, isOverdue: boolean): boolean {
  // Sempre notifica tarefas vencidas
  if (isOverdue) {
    return true;
  }

  // Regras baseadas na prioridade
  switch (priority) {
    case TaskPriority.Urgente:
      // Notifica: 7, 3, 1 dias antes e no dia
      return daysUntilDue <= 7 && (daysUntilDue === 7 || daysUntilDue === 3 || daysUntilDue === 1 || daysUntilDue === 0);
      
    case TaskPriority.Alta:
      // Notifica: 5, 1 dias antes e no dia
      return daysUntilDue <= 5 && (daysUntilDue === 5 || daysUntilDue === 1 || daysUntilDue === 0);
      
    case TaskPriority.Média:
      // Notifica: 3, 1 dias antes e no dia
      return daysUntilDue <= 3 && (daysUntilDue === 3 || daysUntilDue === 1 || daysUntilDue === 0);
      
    case TaskPriority.Baixa:
      // Notifica: 1 dia antes e no dia
      return daysUntilDue <= 1;
      
    default:
      return false;
  }
}

/**
 * Busca dados dos usuários na coleção unificada
 */
async function getUsersData(userIds: string[]): Promise<Record<string, User>> {
  const usersData: Record<string, User> = {};

  try {
    // Buscar na coleção users
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('uid', 'in', userIds)
      .get();

    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      usersData[userData.uid] = {
        uid: userData.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: `${userData.firstName} ${userData.lastName}`,
        hierarchyLevel: userData.hierarchyLevel
      };
    });

    // Log dos usuários não encontrados
    const missingIds = userIds.filter(id => !usersData[id]);
    if (missingIds.length > 0) {
      logger.warn(`Usuários não encontrados na coleção users: ${missingIds.join(', ')}`);
    }

  } catch (error) {
    logger.error("Erro ao buscar dados dos usuários:", error);
  }

  return usersData;
}

/**
 * Verifica se uma notificação foi enviada recentemente para evitar spam
 */
async function wasNotificationSentRecently(taskId: string, daysUntilDue: number): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const notificationId = `${taskId}_${daysUntilDue}_${today}`;
    
    const doc = await admin.firestore()
      .collection('notification_logs')
      .doc(notificationId)
      .get();

    return doc.exists;
  } catch (error) {
    logger.error("Erro ao verificar log de notificação:", error);
    return false;
  }
}

/**
 * Registra que uma notificação foi enviada
 */
async function recordNotificationSent(taskId: string, daysUntilDue: number): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const notificationId = `${taskId}_${daysUntilDue}_${today}`;
    
    await admin.firestore()
      .collection('notification_logs')
      .doc(notificationId)
      .set({
        taskId,
        daysUntilDue,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        date: today
      });

  } catch (error) {
    logger.error("Erro ao registrar log de notificação:", error);
  }
} 