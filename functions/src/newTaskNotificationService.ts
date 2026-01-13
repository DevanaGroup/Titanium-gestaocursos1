import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { Task, User, NotificationEmail } from "./types";

// Interface estendida para usuário com nome
interface ExtendedUser extends User {
  name: string;
}

/**
 * Processa nova tarefa criada e envia notificação por email
 */
export async function processNewTaskCreated(task: Task): Promise<void> {
  try {
    logger.info(`Processando nova tarefa criada: ${task.title}`, {
      taskId: task.id,
      assignedTo: task.assignedTo,
      priority: task.priority
    });

    // Verificar se a tarefa tem responsável
    if (!task.assignedTo) {
      logger.warn(`Tarefa ${task.id} não tem responsável atribuído`);
      return;
    }

    // Verificar se já foi enviada notificação para essa tarefa
    const existingLog = await admin.firestore()
      .collection('new_task_notification_logs')
      .where('taskId', '==', task.id)
      .limit(1)
      .get();

    if (!existingLog.empty) {
      logger.info(`Notificação já enviada para tarefa ${task.id}`);
      return;
    }

    // Buscar dados do responsável
    const assignedUser = await getUserData(task.assignedTo);
    if (!assignedUser || !assignedUser.email) {
      logger.warn(`Usuário responsável não encontrado ou sem email para tarefa ${task.id}`);
      return;
    }

    // Buscar dados do criador da tarefa
    let creatorData = null;
    if (task.createdBy && task.createdBy !== task.assignedTo) {
      creatorData = await getUserData(task.createdBy);
    }

    // Gerar e enviar email
    await sendNewTaskNotificationEmail(task, assignedUser, creatorData);

    // Registrar log de envio
    await recordNewTaskNotificationSent(task.id);

    logger.info(`Notificação de nova tarefa enviada com sucesso para ${assignedUser.email}`);

  } catch (error) {
    logger.error(`Erro ao processar nova tarefa ${task.id}:`, error);
    throw error;
  }
}

/**
 * Busca dados do usuário na coleção users
 */
async function getUserData(userId: string): Promise<ExtendedUser | null> {
  try {
    // Buscar na coleção users
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (userDoc.exists) {
      const data = userDoc.data();
      const name = `${data?.firstName || ''} ${data?.lastName || ''}`.trim() || data?.email || 'Usuário';
      return {
        uid: userId,
        email: data?.email || '',
        firstName: data?.firstName || '',
        lastName: data?.lastName || '',
        displayName: name,
        hierarchyLevel: data?.hierarchyLevel || 'Nível 5',
        name: name
      };
    }

    logger.warn(`Usuário ${userId} não encontrado na coleção users`);
    return null;
  } catch (error) {
    logger.error(`Erro ao buscar dados do usuário ${userId}:`, error);
    return null;
  }
}

/**
 * Envia email de notificação para nova tarefa
 */
async function sendNewTaskNotificationEmail(task: Task, assignedUser: ExtendedUser, creator: ExtendedUser | null): Promise<void> {
  try {
    const emailData: NotificationEmail = {
      to: assignedUser.email,
      message: {
        subject: generateNewTaskEmailSubject(task),
        html: generateNewTaskEmailHTML(task, assignedUser, creator)
      }
    };

    // Adiciona o email à coleção 'mail' para que a extensão Email Trigger processe
    await admin.firestore().collection('mail').add(emailData);
    
    logger.info(`Email de nova tarefa adicionado à fila para ${assignedUser.email}`, {
      taskId: task.id,
      assignedTo: assignedUser.name,
      priority: task.priority
    });

  } catch (error) {
    logger.error("Erro ao enviar notificação de nova tarefa por email:", error);
    throw error;
  }
}

/**
 * Gera o assunto do email para nova tarefa
 */
function generateNewTaskEmailSubject(task: Task): string {
  const priorityPrefix = getPriorityPrefix(task.priority);
  return `${priorityPrefix} NOVA TAREFA ATRIBUÍDA: ${task.title}`;
}

/**
 * Gera o prefixo de prioridade para o assunto
 */
function getPriorityPrefix(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'urgente':
    case 'urgent':
      return '🚨 URGENTE';
    case 'alta':
    case 'high':
      return '⚠️ ALTA';
    case 'média':
    case 'medium':
      return '📋 MÉDIA';
    case 'baixa':
    case 'low':
      return '📌 BAIXA';
    default:
      return '📋 NOVA';
  }
}

/**
 * Gera o HTML do email para nova tarefa
 */
function generateNewTaskEmailHTML(task: Task, assignedUser: ExtendedUser, creator: ExtendedUser | null): string {
  const statusColor = getStatusColor(task.priority);
  const priorityBadge = getPriorityBadge(task.priority);
  const dueDateInfo = getDueDateInfo(task);
  const creatorInfo = creator ? 
    `<p><strong>👤 Criado por:</strong> ${creator.name}</p>` : 
    '<p><strong>👤 Criado por:</strong> Sistema</p>';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nova Tarefa Atribuída</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .task-info { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .due-date { font-weight: bold; color: ${statusColor}; }
            .welcome-box { background-color: #e8f4fd; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .description { background-color: #fff; border-left: 4px solid ${statusColor}; padding: 15px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📋 Nova Tarefa Atribuída</h1>
                <p style="margin: 5px 0; font-size: 14px;">Uma nova tarefa foi criada${creator ? ` por ${creator.name}` : ''}</p>
            </div>
            
            <div class="content">
                <div style="margin-bottom: 20px;">
                    ${priorityBadge}
                </div>
                
                <h2>${task.title}</h2>
                
                ${task.description ? `
                <div class="description">
                    <p><strong>📝 Descrição:</strong></p>
                    <p>${task.description}</p>
                </div>
                ` : ''}
                
                <div class="task-info">
                    <p><strong>📋 ID da Tarefa:</strong> ${task.id}</p>
                    <p><strong>👤 Responsável:</strong> ${assignedUser.name}</p>
                    ${creatorInfo}
                    ${task.clientName ? `<p><strong>🏢 Cliente:</strong> ${task.clientName}</p>` : ''}
                    <p><strong>📅 Data de Vencimento:</strong> <span class="due-date">${dueDateInfo}</span></p>
                    <p><strong>📊 Status:</strong> ${task.status || 'Pendente'}</p>
                </div>
                
                <div class="welcome-box">
                    <p style="margin: 0; color: #0c5460;">
                        <strong>🎯 Próximos Passos:</strong><br>
                        1. Acesse o sistema usando o botão abaixo<br>
                        2. Revise os detalhes da tarefa<br>
                        3. Atualize o status conforme o progresso<br>
                        4. Entre em contato com o criador se tiver dúvidas
                    </p>
                </div>
                
                <div style="margin: 30px 0; text-align: center;">
                    <a href="https://cerradoengenharia.com/dashboard?activeTab=tasks" class="btn">
                        📱 Acessar Sistema
                    </a>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;">
                        <strong>💡 Importante:</strong> Esta é uma notificação automática. Para dúvidas sobre a tarefa, entre em contato com ${creator?.name || 'o criador'}.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>Este é um email automático do Sistema Cerrado Engenharia.</p>
                <p>Para dúvidas técnicas, entre em contato com a equipe de TI.</p>
                <p style="margin-top: 15px; font-size: 10px;">
                    Email enviado em ${new Date().toLocaleString('pt-BR')}
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Obtém a cor baseada na prioridade
 */
function getStatusColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'urgente':
    case 'urgent':
      return '#dc3545';
    case 'alta':
    case 'high':
      return '#fd7e14';
    case 'média':
    case 'medium':
      return '#0d6efd';
    case 'baixa':
    case 'low':
      return '#198754';
    default:
      return '#6c757d';
  }
}

/**
 * Gera badge de prioridade
 */
function getPriorityBadge(priority: string): string {
  const color = getStatusColor(priority);
  const text = priority?.toUpperCase() || 'MÉDIA';
  
  return `<span class="priority-badge" style="background-color: ${color}; color: white;">${text}</span>`;
}

/**
 * Formata informações da data de vencimento
 */
function getDueDateInfo(task: Task): string {
  if (!task.dueDate) {
    return 'Não definida';
  }

  let dueDate: Date;
  if (task.dueDate instanceof Date) {
    dueDate = task.dueDate;
  } else if (typeof task.dueDate === 'string') {
    dueDate = new Date(task.dueDate);
  } else if (task.dueDate.toDate) {
    // Firestore Timestamp
    dueDate = task.dueDate.toDate();
  } else {
    return 'Data inválida';
  }

  if (isNaN(dueDate.getTime())) {
    return 'Data inválida';
  }

  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = dueDate.toLocaleDateString('pt-BR');

  if (diffDays < 0) {
    return `${formattedDate} (VENCIDA há ${Math.abs(diffDays)} dias)`;
  } else if (diffDays === 0) {
    return `${formattedDate} (VENCE HOJE)`;
  } else if (diffDays === 1) {
    return `${formattedDate} (VENCE AMANHÃ)`;
  } else {
    return `${formattedDate} (vence em ${diffDays} dias)`;
  }
}

/**
 * Registra que a notificação foi enviada
 */
async function recordNewTaskNotificationSent(taskId: string): Promise<void> {
  try {
    await admin.firestore().collection('new_task_notification_logs').add({
      taskId: taskId,
      sentAt: new Date(),
      date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
    });
  } catch (error) {
    logger.error(`Erro ao registrar log de notificação para tarefa ${taskId}:`, error);
    throw error;
  }
} 