import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { NotificationEmail } from "./types";

// Interface para dados da rejeição
interface TaskRejectionData {
  taskId: string;
  taskTitle: string;
  priority: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail?: string;
  toUserId: string;
  toUserName: string;
  toUserEmail: string;
  rejectionReason: string;
  rejectionDate: Date;
  clientName?: string;
}

// Interface estendida para usuário com nome
interface ExtendedUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  hierarchyLevel: string;
  name: string;
}

/**
 * Processa rejeição de tarefa e envia notificação por email
 */
export async function processTaskRejection(
  taskId: string,
  taskTitle: string,
  priority: string,
  fromUserId: string,
  fromUserName: string,
  fromUserEmail: string,
  toUserId: string,
  toUserName: string,
  toUserEmail: string,
  rejectionReason: string,
  clientName?: string
): Promise<void> {
  try {
    logger.info(`Processando rejeição de tarefa: ${taskTitle}`, {
      taskId,
      fromUserId,
      toUserId,
      priority
    });

    // Verificar se já foi enviada notificação para esta rejeição
    const existingLog = await admin.firestore()
      .collection('task_rejection_notification_logs')
      .where('taskId', '==', taskId)
      .where('toUserId', '==', toUserId)
      .where('fromUserId', '==', fromUserId)
      .where('date', '==', new Date().toISOString().split('T')[0])
      .limit(1)
      .get();

    if (!existingLog.empty) {
      logger.info(`Notificação de rejeição já enviada para tarefa ${taskId}`);
      return;
    }

    // Buscar dados do usuário que rejeitou se necessário
    let rejectorData = null;
    if (fromUserId !== 'system') {
      rejectorData = await getUserData(fromUserId);
    }

    const rejectionData: TaskRejectionData = {
      taskId,
      taskTitle,
      priority,
      fromUserId,
      fromUserName: rejectorData?.name || fromUserName,
      fromUserEmail: rejectorData?.email,
      toUserId,
      toUserName,
      toUserEmail,
      rejectionReason: rejectionReason || 'Sem motivo especificado',
      rejectionDate: new Date(),
      clientName
    };

    // Gerar e enviar email
    await sendTaskRejectionNotificationEmail(rejectionData);

    // Registrar log de envio
    await recordTaskRejectionNotificationSent(taskId, fromUserId, toUserId);

    logger.info(`Notificação de rejeição enviada com sucesso para ${toUserEmail}`);

  } catch (error) {
    logger.error(`Erro ao processar rejeição da tarefa ${taskId}:`, error);
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
 * Envia email de notificação para rejeição de tarefa
 */
async function sendTaskRejectionNotificationEmail(rejectionData: TaskRejectionData): Promise<void> {
  try {
    const emailData: NotificationEmail = {
      to: rejectionData.toUserEmail,
      message: {
        subject: generateRejectionEmailSubject(rejectionData),
        html: generateRejectionEmailHTML(rejectionData)
      }
    };

    // Adiciona o email à coleção 'mail' para que a extensão Email Trigger processe
    await admin.firestore().collection('mail').add(emailData);
    
    logger.info(`Email de rejeição adicionado à fila para ${rejectionData.toUserEmail}`, {
      taskId: rejectionData.taskId,
      fromUser: rejectionData.fromUserName,
      toUser: rejectionData.toUserName,
      priority: rejectionData.priority
    });

  } catch (error) {
    logger.error("Erro ao enviar notificação de rejeição por email:", error);
    throw error;
  }
}

/**
 * Gera o assunto do email para rejeição
 */
function generateRejectionEmailSubject(data: TaskRejectionData): string {
  const priorityPrefix = getPriorityPrefix(data.priority);
  return `${priorityPrefix} TAREFA REJEITADA: ${data.taskTitle}`;
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
      return '❌ REJEIÇÃO';
  }
}

/**
 * Gera o HTML do email para rejeição
 */
function generateRejectionEmailHTML(data: TaskRejectionData): string {
  const priorityBadge = getPriorityBadge(data.priority);
  const rejectionDateTime = formatRejectionDateTime(data.rejectionDate);
  
  // Remove tags HTML do motivo para exibição segura
  const cleanReason = stripHtmlTags(data.rejectionReason);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tarefa Rejeitada</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 650px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .task-info { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .rejection-info { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .reason-box { background-color: #fff; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; }
            .rejector-info { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .action-box { background-color: #e8f4fd; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>❌ Tarefa Rejeitada</h1>
                <p style="margin: 5px 0; font-size: 14px;">Sua tarefa foi rejeitada por ${data.fromUserName}</p>
            </div>
            
            <div class="content">
                <div style="margin-bottom: 20px;">
                    ${priorityBadge}
                </div>
                
                <h2>${data.taskTitle}</h2>
                
                <div class="rejector-info">
                    <p style="margin: 0; color: #856404;">
                        <strong>👤 Rejeitada por:</strong> ${data.fromUserName}<br>
                        <strong>📅 Data e Hora:</strong> ${rejectionDateTime}
                    </p>
                </div>
                
                <div class="task-info">
                    <p><strong>📋 ID da Tarefa:</strong> ${data.taskId}</p>
                    <p><strong>👤 Responsável Original:</strong> ${data.toUserName}</p>
                    <p><strong>📊 Prioridade:</strong> ${data.priority}</p>
                    ${data.clientName ? `<p><strong>🏢 Cliente:</strong> ${data.clientName}</p>` : ''}
                </div>
                
                <div class="reason-box">
                    <p><strong>📝 Motivo da Rejeição:</strong></p>
                    <div style="margin-top: 10px; line-height: 1.6; color: #721c24;">
                        ${cleanReason}
                    </div>
                </div>
                
                <div class="rejection-info">
                    <p style="margin: 0; color: #721c24;">
                        <strong>⚠️ Atenção:</strong> Esta tarefa foi rejeitada e retornou para você. 
                        Revise o motivo da rejeição acima e faça as correções necessárias antes de tramitar novamente.
                    </p>
                </div>
                
                <div class="action-box">
                    <p style="margin: 0; color: #0c5460;">
                        <strong>🎯 Próximos Passos:</strong><br>
                        1. Acesse o sistema para visualizar a tarefa<br>
                        2. Analise cuidadosamente o motivo da rejeição<br>
                        3. Realize as correções ou ajustes necessários<br>
                        4. Se necessário, entre em contato com quem rejeitou<br>
                        5. Tramite novamente após as correções
                    </p>
                </div>
                
                <div style="margin: 30px 0; text-align: center;">
                    <a href="https://cerradoengenharia.com/dashboard?activeTab=tasks" class="btn">
                        📱 Acessar Sistema
                    </a>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;">
                        <strong>💡 Dica:</strong> Para esclarecer dúvidas sobre a rejeição, entre em contato diretamente com ${data.fromUserName}.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>Este é um email automático do Sistema Cerrado Engenharia.</p>
                <p>Para dúvidas técnicas, entre em contato com a equipe de TI.</p>
                <p style="margin-top: 15px; font-size: 10px;">
                    Email enviado em ${rejectionDateTime}
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Funções auxiliares para cores e badges
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
      return '#6c757d';
    default:
      return '#dc3545';
  }
}

function getPriorityBadge(priority: string): string {
  const color = getStatusColor(priority);
  const label = priority?.toUpperCase() || 'MÉDIA';
  
  return `<span class="priority-badge" style="background-color: ${color}; color: white;">${label}</span>`;
}

function formatRejectionDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function stripHtmlTags(html: string): string {
  if (!html) return '';
  
  // Remove tags HTML e entidades
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Registra que a notificação foi enviada
 */
async function recordTaskRejectionNotificationSent(
  taskId: string, 
  fromUserId: string, 
  toUserId: string
): Promise<void> {
  try {
    await admin.firestore().collection('task_rejection_notification_logs').add({
      taskId: taskId,
      fromUserId: fromUserId,
      toUserId: toUserId,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
    });
  } catch (error) {
    logger.error(`Erro ao registrar log de notificação de rejeição para tarefa ${taskId}:`, error);
    throw error;
  }
} 