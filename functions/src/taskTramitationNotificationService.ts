import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { NotificationEmail } from "./types";

// Interface para dados da tramitação
interface TaskTramitationData {
  taskId: string;
  taskTitle: string;
  priority: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail?: string;
  toUserId: string;
  toUserName: string;
  toUserEmail: string;
  richNotes: string;
  attachments?: ProcessAttachment[];
  tramitationDate: Date;
  clientName?: string;
}

interface ProcessAttachment {
  id: string;
  name: string;
  originalName: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  uploadedByName: string;
}

// Interface estendida para usuário
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
 * Processa tramitação de tarefa e envia notificação por email
 */
export async function processTaskTramitation(
  taskId: string,
  taskTitle: string,
  priority: string,
  fromUserId: string,
  fromUserName: string,
  toUserId: string,
  toUserName: string,
  toUserEmail: string,
  richNotes: string,
  attachments?: ProcessAttachment[],
  clientName?: string
): Promise<void> {
  try {
    logger.info(`Processando tramitação de tarefa: ${taskTitle}`, {
      taskId,
      fromUserId,
      toUserId,
      priority
    });

    // Verificar se já foi enviada notificação para esta tramitação
    const existingLog = await admin.firestore()
      .collection('task_tramitation_notification_logs')
      .where('taskId', '==', taskId)
      .where('toUserId', '==', toUserId)
      .where('fromUserId', '==', fromUserId)
      .where('date', '==', new Date().toISOString().split('T')[0])
      .limit(1)
      .get();

    if (!existingLog.empty) {
      logger.info(`Notificação de tramitação já enviada para tarefa ${taskId}`);
      return;
    }

    // Buscar dados do remetente se necessário
    let senderData = null;
    if (fromUserId !== 'system') {
      senderData = await getUserData(fromUserId);
    }

    const tramitationData: TaskTramitationData = {
      taskId,
      taskTitle,
      priority,
      fromUserId,
      fromUserName: senderData?.name || fromUserName,
      fromUserEmail: senderData?.email,
      toUserId,
      toUserName,
      toUserEmail,
      richNotes: richNotes || 'Sem observações adicionais',
      attachments: attachments || [],
      tramitationDate: new Date(),
      clientName
    };

    // Gerar e enviar email
    await sendTaskTramitationNotificationEmail(tramitationData);

    // Registrar log de envio
    await recordTaskTramitationNotificationSent(taskId, fromUserId, toUserId);

    logger.info(`Notificação de tramitação enviada com sucesso para ${toUserEmail}`);

  } catch (error) {
    logger.error(`Erro ao processar tramitação da tarefa ${taskId}:`, error);
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
 * Envia email de notificação para tramitação de tarefa
 */
async function sendTaskTramitationNotificationEmail(tramitationData: TaskTramitationData): Promise<void> {
  try {
    const emailData: NotificationEmail = {
      to: tramitationData.toUserEmail,
      message: {
        subject: generateTramitationEmailSubject(tramitationData),
        html: generateTramitationEmailHTML(tramitationData)
      }
    };

    // Adiciona o email à coleção 'mail' para que a extensão Email Trigger processe
    await admin.firestore().collection('mail').add(emailData);
    
    logger.info(`Email de tramitação adicionado à fila para ${tramitationData.toUserEmail}`, {
      taskId: tramitationData.taskId,
      fromUser: tramitationData.fromUserName,
      toUser: tramitationData.toUserName,
      priority: tramitationData.priority
    });

  } catch (error) {
    logger.error("Erro ao enviar notificação de tramitação por email:", error);
    throw error;
  }
}

/**
 * Gera o assunto do email para tramitação
 */
function generateTramitationEmailSubject(data: TaskTramitationData): string {
  const priorityPrefix = getPriorityPrefix(data.priority);
  return `${priorityPrefix} TAREFA TRAMITADA: ${data.taskTitle}`;
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
      return '📋 TRAMITAÇÃO';
  }
}

/**
 * Gera o HTML do email para tramitação
 */
function generateTramitationEmailHTML(data: TaskTramitationData): string {
  const statusColor = getStatusColor(data.priority);
  const priorityBadge = getPriorityBadge(data.priority);
  const tramitationDateTime = formatTramitationDateTime(data.tramitationDate);
  const attachmentsInfo = generateAttachmentsInfo(data.attachments || []);
  
  // Remove tags HTML do parecer para exibição segura
  const cleanNotes = stripHtmlTags(data.richNotes);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tarefa Tramitada</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 650px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .task-info { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .tramitation-info { background-color: #e8f4fd; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .parecer-box { background-color: #fff; border-left: 4px solid ${statusColor}; padding: 15px; margin: 15px 0; }
            .attachments-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .attachment-item { display: flex; align-items: center; margin: 5px 0; font-size: 14px; }
            .sender-info { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔄 Tarefa Tramitada</h1>
                <p style="margin: 5px 0; font-size: 14px;">Você recebeu uma tarefa de ${data.fromUserName}</p>
            </div>
            
            <div class="content">
                <div style="margin-bottom: 20px;">
                    ${priorityBadge}
                </div>
                
                <h2>${data.taskTitle}</h2>
                
                <div class="sender-info">
                    <p style="margin: 0; color: #155724;">
                        <strong>👤 Enviado por:</strong> ${data.fromUserName}<br>
                        <strong>📅 Data e Hora:</strong> ${tramitationDateTime}
                    </p>
                </div>
                
                <div class="task-info">
                    <p><strong>📋 ID da Tarefa:</strong> ${data.taskId}</p>
                    <p><strong>👤 Novo Responsável:</strong> ${data.toUserName}</p>
                    <p><strong>📊 Prioridade:</strong> ${data.priority}</p>
                    ${data.clientName ? `<p><strong>🏢 Cliente:</strong> ${data.clientName}</p>` : ''}
                </div>
                
                <div class="parecer-box">
                    <p><strong>📝 Parecer e Instruções:</strong></p>
                    <div style="margin-top: 10px; line-height: 1.6;">
                        ${cleanNotes}
                    </div>
                </div>
                
                ${attachmentsInfo}
                
                <div class="tramitation-info">
                    <p style="margin: 0; color: #0c5460;">
                        <strong>🎯 Próximos Passos:</strong><br>
                        1. Acesse o sistema para visualizar a tarefa completa<br>
                        2. Revise o parecer e instruções acima<br>
                        3. Analise os documentos anexos (se houver)<br>
                        4. Execute as ações necessárias<br>
                        5. Atualize o status ou tramite para o próximo responsável
                    </p>
                </div>
                
                <div style="margin: 30px 0; text-align: center;">
                    <a href="https://cerradoengenharia.com/dashboard?activeTab=tasks" class="btn">
                        📱 Acessar Sistema
                    </a>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;">
                        <strong>💡 Importante:</strong> Esta tarefa foi tramitada para você. Para dúvidas sobre as instruções, entre em contato com ${data.fromUserName}.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>Este é um email automático do Sistema Cerrado Engenharia.</p>
                <p>Notificação de tramitação enviada em ${new Date().toLocaleString('pt-BR')}</p>
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
 * Formata data e hora da tramitação
 */
function formatTramitationDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

/**
 * Gera informações sobre anexos
 */
function generateAttachmentsInfo(attachments: ProcessAttachment[]): string {
  if (!attachments || attachments.length === 0) {
    return `
      <div class="attachments-box">
        <p style="margin: 0; color: #856404;">
          <strong>📎 Anexos:</strong> Nenhum documento anexado
        </p>
      </div>
    `;
  }

  const attachmentsList = attachments.map(attachment => {
    const sizeInMB = (attachment.size / (1024 * 1024)).toFixed(2);
    return `
      <div class="attachment-item">
        📄 ${attachment.originalName} (${sizeInMB} MB)
      </div>
    `;
  }).join('');

  return `
    <div class="attachments-box">
      <p style="margin: 0 0 10px 0; color: #856404;">
        <strong>📎 Documentos Anexados (${attachments.length}):</strong>
      </p>
      ${attachmentsList}
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #856404;">
        💡 Acesse o sistema para visualizar e baixar os documentos
      </p>
    </div>
  `;
}

/**
 * Remove tags HTML do texto
 */
function stripHtmlTags(html: string): string {
  if (!html) return 'Sem observações adicionais';
  
  // Remove tags HTML básicas e substitui por formatação simples
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '$1')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim() || 'Sem observações adicionais';
}

/**
 * Registra que a notificação foi enviada
 */
async function recordTaskTramitationNotificationSent(
  taskId: string, 
  fromUserId: string, 
  toUserId: string
): Promise<void> {
  try {
    await admin.firestore().collection('task_tramitation_notification_logs').add({
      taskId,
      fromUserId,
      toUserId,
      sentAt: new Date(),
      date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
    });
  } catch (error) {
    logger.error(`Erro ao registrar log de tramitação para tarefa ${taskId}:`, error);
    throw error;
  }
} 