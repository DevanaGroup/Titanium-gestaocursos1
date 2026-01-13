import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { TaskNotificationData, TaskPriority, NotificationEmail } from "./types";

/**
 * Cria um email de notificação para a coleção mail (Email Trigger Extension)
 */
export async function sendTaskNotificationEmail(notificationData: TaskNotificationData): Promise<void> {
  try {
    const emailData: NotificationEmail = {
      to: notificationData.assignedToEmail,
      message: {
        subject: generateEmailSubject(notificationData),
        html: generateEmailHTML(notificationData)
      }
    };

    // Adiciona o email à coleção 'mail' para que a extensão Email Trigger processe
    await admin.firestore().collection('mail').add(emailData);
    
    logger.info(`Email de notificação adicionado à fila para ${notificationData.assignedToEmail}`, {
      taskId: notificationData.taskId,
      priority: notificationData.priority
    });

  } catch (error) {
    logger.error("Erro ao enviar notificação por email:", error);
    throw error;
  }
}

/**
 * Gera o assunto do email baseado na prioridade e status da tarefa
 */
function generateEmailSubject(data: TaskNotificationData): string {
  const priorityPrefix = getPriorityPrefix(data.priority);
  
  if (data.isOverdue) {
    return `${priorityPrefix} TAREFA VENCIDA: ${data.taskTitle}`;
  }
  
  if (data.daysUntilDue === 0) {
    return `${priorityPrefix} TAREFA VENCE HOJE: ${data.taskTitle}`;
  }
  
  if (data.daysUntilDue === 1) {
    return `${priorityPrefix} TAREFA VENCE AMANHÃ: ${data.taskTitle}`;
  }
  
  return `${priorityPrefix} Lembrete de Tarefa: ${data.taskTitle}`;
}

/**
 * Gera o HTML do email
 */
function generateEmailHTML(data: TaskNotificationData): string {
  const statusColor = getStatusColor(data);
  const priorityBadge = getPriorityBadge(data.priority);
  const dueDateInfo = getDueDateInfo(data);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notificação de Tarefa</title>
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
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 Notificação de Tarefa</h1>
            </div>
            
            <div class="content">
                <div style="margin-bottom: 20px;">
                    ${priorityBadge}
                </div>
                
                <h2>${data.taskTitle}</h2>
                
                <div class="task-info">
                    <p><strong>📋 ID da Tarefa:</strong> ${data.taskId}</p>
                    <p><strong>👤 Responsável:</strong> ${data.assignedToName}</p>
                    ${data.clientName ? `<p><strong>🏢 Cliente:</strong> ${data.clientName}</p>` : ''}
                    <p><strong>📅 Data de Vencimento:</strong> <span class="due-date">${dueDateInfo}</span></p>
                </div>
                
                <div style="margin: 30px 0;">
                    <a href="https://cerradoengenharia.com/task/${data.taskId}" class="btn">
                        📱 Visualizar Tarefa
                    </a>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;">
                        <strong>💡 Dica:</strong> Acesse o sistema para visualizar todos os detalhes da tarefa e atualizar seu status.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>Este é um email automático do Sistema Cerrado Engenharia.</p>
                <p>Para dúvidas, entre em contato com a equipe de TI.</p>
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
 * Retorna o prefixo baseado na prioridade
 */
function getPriorityPrefix(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.Urgente:
      return "🚨 URGENTE";
    case TaskPriority.Alta:
      return "⚠️ ALTA";
    case TaskPriority.Média:
      return "📋 MÉDIA";
    default:
      return "📌 BAIXA";
  }
}

/**
 * Retorna a cor baseada no status da tarefa
 */
function getStatusColor(data: TaskNotificationData): string {
  if (data.isOverdue) {
    return "#dc3545"; // vermelho
  }
  
  switch (data.priority) {
    case TaskPriority.Urgente:
      return "#dc3545"; // vermelho
    case TaskPriority.Alta:
      return "#fd7e14"; // laranja
    case TaskPriority.Média:
      return "#ffc107"; // amarelo
    default:
      return "#007bff"; // azul
  }
}

/**
 * Gera o badge da prioridade
 */
function getPriorityBadge(priority: TaskPriority): string {
  const colors = {
    [TaskPriority.Urgente]: { bg: "#dc3545", text: "white" },
    [TaskPriority.Alta]: { bg: "#fd7e14", text: "white" },
    [TaskPriority.Média]: { bg: "#ffc107", text: "#212529" },
    [TaskPriority.Baixa]: { bg: "#28a745", text: "white" }
  };
  
  const color = colors[priority];
  
  return `
    <span class="priority-badge" style="background-color: ${color.bg}; color: ${color.text};">
      ${priority.toUpperCase()}
    </span>
  `;
}

/**
 * Formata as informações da data de vencimento
 */
function getDueDateInfo(data: TaskNotificationData): string {
  const dueDate = data.dueDate.toLocaleDateString('pt-BR');
  
  if (data.isOverdue) {
    return `${dueDate} (VENCIDA - ${Math.abs(data.daysUntilDue)} dias de atraso)`;
  }
  
  if (data.daysUntilDue === 0) {
    return `${dueDate} (VENCE HOJE)`;
  }
  
  if (data.daysUntilDue === 1) {
    return `${dueDate} (VENCE AMANHÃ)`;
  }
  
  return `${dueDate} (${data.daysUntilDue} dias restantes)`;
} 