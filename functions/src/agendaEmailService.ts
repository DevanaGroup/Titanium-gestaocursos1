import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { AgendaNotificationData, AgendaEventType, TaskPriority, NotificationEmail } from "./types";

/**
 * Cria um email de notificação para eventos da agenda
 */
export async function sendAgendaNotificationEmail(notificationData: AgendaNotificationData): Promise<void> {
  try {
    const emailData: NotificationEmail = {
      to: notificationData.participantEmail,
      message: {
        subject: generateEmailSubject(notificationData),
        html: generateEmailHTML(notificationData)
      }
    };

    // Adiciona o email à coleção 'mail' para que a extensão Email Trigger processe
    await admin.firestore().collection('mail').add(emailData);
    
    logger.info(`Email de notificação da agenda adicionado à fila para ${notificationData.participantEmail}`, {
      eventId: notificationData.eventId,
      eventType: notificationData.eventType,
      priority: notificationData.priority,
      participantName: notificationData.participantName
    });

  } catch (error) {
    logger.error("Erro ao enviar notificação de agenda por email:", error);
    throw error;
  }
}

/**
 * Gera o assunto do email baseado no tipo de evento e tempo
 */
function generateEmailSubject(data: AgendaNotificationData): string {
  const priorityPrefix = getPriorityPrefix(data.priority);
  const eventTypeEmoji = getEventTypeEmoji(data.eventType);
  
  if (data.isToday) {
    if (data.hoursUntilEvent <= 1) {
      return `${priorityPrefix} ${eventTypeEmoji} HOJE EM BREVE: ${data.eventTitle}`;
    }
    return `${priorityPrefix} ${eventTypeEmoji} HOJE: ${data.eventTitle}`;
  }
  
  if (data.isTomorrow) {
    return `${priorityPrefix} ${eventTypeEmoji} AMANHÃ: ${data.eventTitle}`;
  }
  
  if (data.hoursUntilEvent <= 24) {
    return `${priorityPrefix} ${eventTypeEmoji} EM ${data.hoursUntilEvent}H: ${data.eventTitle}`;
  }
  
  return `${priorityPrefix} ${eventTypeEmoji} Lembrete: ${data.eventTitle}`;
}

/**
 * Gera o HTML do email para eventos da agenda
 */
function generateEmailHTML(data: AgendaNotificationData): string {
  const statusColor = getEventStatusColor(data);
  const priorityBadge = getPriorityBadge(data.priority);
  const eventTypeInfo = getEventTypeInfo(data.eventType);
  const timeInfo = getTimeInfo(data);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notificação de Agenda</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .event-info { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
            .event-type-badge { display: inline-block; padding: 6px 14px; border-radius: 15px; font-size: 13px; font-weight: bold; margin-bottom: 15px; background-color: #e3f2fd; color: #1976d2; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .time-info { font-weight: bold; color: ${statusColor}; font-size: 18px; text-align: center; margin: 15px 0; }
            .location-info { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📅 Lembrete de Agenda</h1>
            </div>
            
            <div class="content">
                <div style="margin-bottom: 20px;">
                    ${priorityBadge}
                    ${eventTypeInfo}
                </div>
                
                <h2>${data.eventTitle}</h2>
                
                <div class="time-info">
                    ${timeInfo}
                </div>
                
                <div class="event-info">
                    <p><strong>📋 ID do Evento:</strong> ${data.eventId}</p>
                    <p><strong>🎯 Tipo:</strong> ${data.eventType}</p>
                    <p><strong>👤 Organizador:</strong> ${data.ownerName}</p>
                    <p><strong>👥 Participante:</strong> ${data.participantName}${data.participantRole ? ` (${data.participantRole})` : ''}</p>
                    ${data.clientName ? `<p><strong>🏢 Cliente:</strong> ${data.clientName}</p>` : ''}
                    <p><strong>🕐 Horário:</strong> ${formatDateTime(data.startDate)} até ${formatDateTime(data.endDate)}</p>
                    ${data.location ? `<p><strong>📍 Local:</strong> ${data.location}</p>` : ''}
                </div>
                
                <div style="margin: 30px 0;">
                    <a href="https://cerradoengenharia.com/agenda" class="btn">
                        📱 Acessar Agenda
                    </a>
                </div>
                
                ${data.location ? `
                <div class="location-info">
                    <p style="margin: 0; color: #856404;">
                        <strong>📍 Local do evento:</strong> ${data.location}
                        <br>
                        <small>Lembre-se de considerar o tempo de deslocamento!</small>
                    </p>
                </div>
                ` : ''}
                
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; color: #155724;">
                        <strong>💡 Dica:</strong> Certifique-se de ter todos os materiais necessários preparados para este ${data.eventType.toLowerCase()}.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>Este é um email automático do Sistema de Agenda Cerrado Engenharia.</p>
                <p>Para reagendar ou cancelar, acesse o sistema.</p>
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
 * Retorna emoji baseado no tipo de evento
 */
function getEventTypeEmoji(eventType: AgendaEventType): string {
  switch (eventType) {
    case AgendaEventType.Reuniao:
      return "👥";
    case AgendaEventType.VisitaTecnica:
      return "🔧";
    case AgendaEventType.Apresentacao:
      return "📊";
    case AgendaEventType.Treinamento:
      return "📚";
    case AgendaEventType.Almoco:
      return "🍽️";
    case AgendaEventType.Audiencia:
      return "⚖️";
    case AgendaEventType.Deslocamento:
      return "🚗";
    case AgendaEventType.DespachoInterno:
      return "📋";
    case AgendaEventType.Compromisso:
      return "📝";
    default:
      return "📅";
  }
}

/**
 * Retorna a cor baseada na prioridade do evento
 */
function getEventStatusColor(data: AgendaNotificationData): string {
  if (data.isToday && data.hoursUntilEvent <= 2) {
    return "#dc3545"; // vermelho para eventos muito próximos
  }
  
  switch (data.priority) {
    case TaskPriority.Urgente:
      return "#dc3545"; // vermelho
    case TaskPriority.Alta:
      return "#fd7e14"; // laranja
    case TaskPriority.Média:
      return "#007bff"; // azul
    default:
      return "#28a745"; // verde
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
      PRIORIDADE ${priority.toUpperCase()}
    </span>
  `;
}

/**
 * Gera informações do tipo de evento
 */
function getEventTypeInfo(eventType: AgendaEventType): string {
  const emoji = getEventTypeEmoji(eventType);
  
  return `
    <span class="event-type-badge">
      ${emoji} ${eventType.toUpperCase()}
    </span>
  `;
}

/**
 * Formata informações de tempo
 */
function getTimeInfo(data: AgendaNotificationData): string {
  if (data.isToday) {
    if (data.hoursUntilEvent <= 1) {
      return `⏰ COMEÇANDO HOJE EM BREVE!`;
    }
    return `⏰ HOJE EM ${data.hoursUntilEvent} HORA${data.hoursUntilEvent > 1 ? 'S' : ''}`;
  }
  
  if (data.isTomorrow) {
    return `📅 AMANHÃ`;
  }
  
  return `📅 EM ${data.hoursUntilEvent} HORA${data.hoursUntilEvent > 1 ? 'S' : ''}`;
}

/**
 * Formata data e hora
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Cria um email de notificação IMEDIATA para evento recém-criado
 */
export async function sendEventCreatedNotification(eventData: any, participant: any): Promise<void> {
  try {
    const emailData: NotificationEmail = {
      to: participant.email,
      message: {
        subject: generateEventCreatedSubject(eventData),
        html: generateEventCreatedHTML(eventData, participant)
      }
    };

    // Adiciona o email à coleção 'mail' para que a extensão Email Trigger processe
    await admin.firestore().collection('mail').add(emailData);
    
    logger.info(`Email de evento criado adicionado à fila para ${participant.email}`, {
      eventId: eventData.id,
      eventTitle: eventData.title,
      participantName: participant.name
    });

  } catch (error) {
    logger.error("Erro ao enviar notificação de evento criado:", error);
    throw error;
  }
}

/**
 * Gera o assunto do email para evento recém-criado
 */
function generateEventCreatedSubject(eventData: any): string {
  const priorityPrefix = getPriorityPrefix(eventData.priority);
  const eventTypeEmoji = getEventTypeEmoji(eventData.type);
  
  return `${priorityPrefix} ${eventTypeEmoji} NOVO EVENTO AGENDADO: ${eventData.title}`;
}

/**
 * Gera o HTML do email para evento recém-criado
 */
function generateEventCreatedHTML(eventData: any, participant: any): string {
  const statusColor = getEventCreatedStatusColor(eventData.priority);
  const priorityBadge = getPriorityBadge(eventData.priority);
  const eventTypeInfo = getEventTypeInfo(eventData.type);
  const dateInfo = getEventDateInfo(eventData);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Novo Evento Agendado</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .event-info { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
            .event-type-badge { display: inline-block; padding: 6px 14px; border-radius: 15px; font-size: 13px; font-weight: bold; margin-bottom: 15px; background-color: #e3f2fd; color: #1976d2; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .new-event-info { font-weight: bold; color: ${statusColor}; font-size: 18px; text-align: center; margin: 15px 0; }
            .location-info { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .created-badge { background-color: #28a745; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Novo Evento Agendado!</h1>
            </div>
            
            <div class="content">
                <div class="created-badge">
                    ✨ EVENTO RECÉM-CRIADO
                </div>
                
                <div style="margin-bottom: 20px;">
                    ${priorityBadge}
                    ${eventTypeInfo}
                </div>
                
                <h2>${eventData.title}</h2>
                
                <div class="new-event-info">
                    📅 ${dateInfo}
                </div>
                
                <div class="event-info">
                    <p><strong>📋 ID do Evento:</strong> ${eventData.id}</p>
                    <p><strong>🎯 Tipo:</strong> ${eventData.type}</p>
                    <p><strong>👤 Organizador:</strong> ${eventData.ownerName}</p>
                    <p><strong>👥 Participante:</strong> ${participant.name}${participant.hierarchyLevel ? ` (${participant.hierarchyLevel})` : ''}</p>
                    ${eventData.clientName ? `<p><strong>🏢 Cliente:</strong> ${eventData.clientName}</p>` : ''}
                    <p><strong>🕐 Horário:</strong> ${formatDateTime(new Date(eventData.startDate))} até ${formatDateTime(new Date(eventData.endDate))}</p>
                    ${eventData.location ? `<p><strong>📍 Local:</strong> ${eventData.location}</p>` : ''}
                    ${eventData.description ? `<p><strong>📝 Descrição:</strong> ${eventData.description}</p>` : ''}
                </div>
                
                <div style="margin: 30px 0;">
                    <a href="https://cerradoengenharia.com/agenda" class="btn">
                        📱 Acessar Agenda
                    </a>
                </div>
                
                ${eventData.location ? `
                <div class="location-info">
                    <p style="margin: 0; color: #856404;">
                        <strong>📍 Local do evento:</strong> ${eventData.location}
                        <br>
                        <small>Lembre-se de considerar o tempo de deslocamento!</small>
                    </p>
                </div>
                ` : ''}
                
                <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; color: #0c5460;">
                        <strong>🔔 Lembretes automáticos:</strong> Você também receberá lembretes baseados na prioridade do evento:
                        <br>
                        ${getPriorityReminderText(eventData.priority)}
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>Este é um email automático do Sistema de Agenda Cerrado Engenharia.</p>
                <p>Evento criado em ${new Date().toLocaleString('pt-BR')}</p>
                <p style="margin-top: 15px; font-size: 10px;">
                    Para reagendar ou cancelar, acesse o sistema.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Retorna a cor para eventos recém-criados
 */
function getEventCreatedStatusColor(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.Urgente:
      return "#dc3545"; // vermelho
    case TaskPriority.Alta:
      return "#fd7e14"; // laranja
    case TaskPriority.Média:
      return "#007bff"; // azul
    default:
      return "#28a745"; // verde
  }
}

/**
 * Gera informações da data do evento
 */
function getEventDateInfo(eventData: any): string {
  const startDate = new Date(eventData.startDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  
  const diffTime = eventDay.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `HOJE às ${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `AMANHÃ às ${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays > 1) {
    return `Em ${diffDays} dias - ${startDate.toLocaleDateString('pt-BR')} às ${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return `${startDate.toLocaleDateString('pt-BR')} às ${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

/**
 * Retorna texto explicativo sobre lembretes baseado na prioridade
 */
function getPriorityReminderText(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.Urgente:
      return "• 24h, 4h, 1h e 30min antes do evento";
    case TaskPriority.Alta:
      return "• 24h, 2h e 30min antes do evento";
    case TaskPriority.Média:
      return "• 24h e 1h antes do evento";
    default:
      return "• 24h antes do evento";
  }
} 