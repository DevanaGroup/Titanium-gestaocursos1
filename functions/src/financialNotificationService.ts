import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { 
  FinancialDue, 
  FinancialNotificationData, 
  NotificationEmail, 
  TaskPriority, 
  User 
} from "./types";

/**
 * Verifica e envia notificações para vencimentos financeiros baseado na prioridade
 */
export async function checkAndSendFinancialNotifications(): Promise<void> {
  try {
    logger.info("Iniciando verificação de notificações financeiras...");
    
    // Busca todas as contas a pagar e receber pendentes
    const [payablesSnapshot, receivablesSnapshot] = await Promise.all([
      admin.firestore()
        .collection('accountsPayable')
        .where('status', '==', 'PENDENTE')
        .get(),
      admin.firestore()
        .collection('accountsReceivable')
        .where('status', '==', 'PENDENTE')
        .get()
    ]);

    const payables = payablesSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'PAYABLE' as const,
      ...doc.data(),
      dueDate: doc.data().dueDate.toDate(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));

    const receivables = receivablesSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'RECEIVABLE' as const,
      ...doc.data(),
      dueDate: doc.data().dueDate.toDate(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));

    const allDues = [...payables, ...receivables];

    if (allDues.length === 0) {
      logger.info("Nenhum vencimento financeiro encontrado.");
      return;
    }

    logger.info(`Encontrados ${allDues.length} vencimentos financeiros para verificação`);

    // Busca informações dos usuários responsáveis
    // @ts-ignore - propriedade createdBy pode não estar no tipo mas existe em runtime
    const userIds = [...new Set([
      // @ts-ignore
      ...payables.map(item => item.createdBy),
      // @ts-ignore
      ...receivables.map(item => item.createdBy)
    ])];
    
    const usersData = await getUsersData(userIds);

    // Processa cada vencimento
    const notificationPromises = allDues
      // @ts-ignore - tipo não corresponde exatamente mas funciona em runtime
      .map(due => processFinancialNotification(due, usersData))
      .filter(promise => promise !== null);

    if (notificationPromises.length > 0) {
      await Promise.all(notificationPromises);
      logger.info(`${notificationPromises.length} notificações financeiras processadas`);
    } else {
      logger.info("Nenhuma notificação financeira precisa ser enviada no momento");
    }

  } catch (error) {
    logger.error("Erro ao verificar notificações financeiras:", error);
    throw error;
  }
}

/**
 * Processa um vencimento individual e determina se deve enviar notificação
 */
async function processFinancialNotification(
  due: FinancialDue, 
  usersData: Record<string, User>
): Promise<void | null> {
  try {
    // Determina quem deve receber a notificação
    const responsibleUser = usersData[due.createdBy];
    if (!responsibleUser || !responsibleUser.email) {
      logger.warn(`Usuário responsável não encontrado ou sem email para ${due.type} ${due.id}`);
      return null;
    }

    const dueDate = due.dueDate;
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDue < 0;

    // Determina a prioridade baseada no valor e tipo
    const priority = getFinancialPriority(due.totalAmount, due.type);

    // Determina se deve enviar notificação baseado na prioridade
    if (!shouldSendFinancialNotification(priority, daysUntilDue, isOverdue)) {
      return null;
    }

    // Verifica se já enviou notificação recentemente
    if (await wasFinancialNotificationSentRecently(due.id, daysUntilDue, due.type)) {
      return null;
    }

    const notificationData: FinancialNotificationData = {
      dueId: due.id,
      type: due.type,
      description: due.description,
      amount: due.totalAmount,
      dueDate: dueDate,
      clientName: due.clientName || due.supplierName,
      responsibleUserId: due.createdBy,
      // @ts-ignore - propriedade name pode não estar no tipo User mas existe em runtime
      responsibleUserName: responsibleUser.name,
      responsibleUserEmail: responsibleUser.email,
      priority: priority,
      daysUntilDue: daysUntilDue,
      isOverdue: isOverdue,
      installmentInfo: due.installments ? {
        current: due.installments.findIndex(i => i.status === 'PENDENTE') + 1,
        total: due.installments.length
      } : undefined
    };

    // Envia o email
    await sendFinancialNotificationEmail(notificationData);

    // Registra que a notificação foi enviada
    await recordFinancialNotificationSent(due.id, daysUntilDue, due.type);

    logger.info(`Notificação financeira enviada para ${due.type} ${due.id} - ${due.description}`);

  } catch (error) {
    logger.error(`Erro ao processar notificação financeira para ${due.type} ${due.id}:`, error);
  }

  return null;
}

/**
 * Determina a prioridade baseada no valor e tipo do vencimento
 */
function getFinancialPriority(amount: number, type: 'PAYABLE' | 'RECEIVABLE'): TaskPriority {
  // Valores em reais para determinação de prioridade
  const thresholds = {
    urgent: 50000,    // Acima de 50k
    high: 10000,      // Entre 10k e 50k
    medium: 5000,     // Entre 5k e 10k
    low: 0            // Abaixo de 5k
  };

  if (amount >= thresholds.urgent) return TaskPriority.Urgente;
  if (amount >= thresholds.high) return TaskPriority.Alta;
  if (amount >= thresholds.medium) return TaskPriority.Média;
  return TaskPriority.Baixa;
}

/**
 * Determina se deve enviar notificação baseado na prioridade e prazo
 */
function shouldSendFinancialNotification(
  priority: TaskPriority, 
  daysUntilDue: number, 
  isOverdue: boolean
): boolean {
  // Sempre notifica vencimentos em atraso
  if (isOverdue) {
    return true;
  }

  // Regras baseadas na prioridade para notificações financeiras
  // TODAS as prioridades agora começam a notificar pelo menos 10 dias antes
  switch (priority) {
    case TaskPriority.Urgente:
      // Notifica: 30, 15, 10, 7, 5, 3, 1 dias antes e no dia
      return daysUntilDue <= 30 && (
        daysUntilDue === 30 || 
        daysUntilDue === 15 || 
        daysUntilDue === 10 || 
        daysUntilDue === 7 || 
        daysUntilDue === 5 || 
        daysUntilDue === 3 || 
        daysUntilDue === 1 || 
        daysUntilDue === 0
      );
      
    case TaskPriority.Alta:
      // Notifica: 20, 15, 10, 7, 3, 1 dias antes e no dia
      return daysUntilDue <= 20 && (
        daysUntilDue === 20 || 
        daysUntilDue === 15 || 
        daysUntilDue === 10 || 
        daysUntilDue === 7 || 
        daysUntilDue === 3 || 
        daysUntilDue === 1 || 
        daysUntilDue === 0
      );
      
    case TaskPriority.Média:
      // Notifica: 15, 10, 7, 5, 3, 1 dias antes e no dia
      return daysUntilDue <= 15 && (
        daysUntilDue === 15 || 
        daysUntilDue === 10 || 
        daysUntilDue === 7 || 
        daysUntilDue === 5 || 
        daysUntilDue === 3 || 
        daysUntilDue === 1 || 
        daysUntilDue === 0
      );
      
    case TaskPriority.Baixa:
      // Notifica: 10, 7, 5, 3, 1 dias antes e no dia
      return daysUntilDue <= 10 && (
        daysUntilDue === 10 || 
        daysUntilDue === 7 || 
        daysUntilDue === 5 || 
        daysUntilDue === 3 || 
        daysUntilDue === 1 || 
        daysUntilDue === 0
      );
      
    default:
      return false;
  }
}

/**
 * Verifica se uma notificação financeira foi enviada recentemente
 */
async function wasFinancialNotificationSentRecently(
  dueId: string, 
  daysUntilDue: number, 
  type: 'PAYABLE' | 'RECEIVABLE'
): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const logId = `${dueId}_${type}_${daysUntilDue}_${today}`;

  const logDoc = await admin.firestore()
    .collection('financial_notification_logs')
    .doc(logId)
    .get();

  return logDoc.exists;
}

/**
 * Registra que uma notificação financeira foi enviada
 */
async function recordFinancialNotificationSent(
  dueId: string, 
  daysUntilDue: number, 
  type: 'PAYABLE' | 'RECEIVABLE'
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const logId = `${dueId}_${type}_${daysUntilDue}_${today}`;

  await admin.firestore()
    .collection('financial_notification_logs')
    .doc(logId)
    .set({
      dueId,
      type,
      daysUntilDue,
      date: today,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Busca dados dos usuários
 */
async function getUsersData(userIds: string[]): Promise<Record<string, User>> {
  if (userIds.length === 0) return {};

  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where(admin.firestore.FieldPath.documentId(), 'in', userIds)
    .get();

  const usersData: Record<string, User> = {};
  usersSnapshot.docs.forEach(doc => {
    // @ts-ignore - conversão de tipo necessária para compatibilidade
    usersData[doc.id] = {
      id: doc.id,
      ...doc.data()
    } as User;
  });

  return usersData;
}

/**
 * Envia email de notificação financeira
 */
async function sendFinancialNotificationEmail(notificationData: FinancialNotificationData): Promise<void> {
  try {
    const emailData: NotificationEmail = {
      to: notificationData.responsibleUserEmail,
      message: {
        subject: generateFinancialEmailSubject(notificationData),
        html: generateFinancialEmailHTML(notificationData)
      }
    };

    // Adiciona o email à coleção 'mail' para que a extensão Email Trigger processe
    await admin.firestore().collection('mail').add(emailData);
    
    logger.info(`Email de notificação financeira adicionado à fila para ${notificationData.responsibleUserEmail}`, {
      dueId: notificationData.dueId,
      type: notificationData.type,
      priority: notificationData.priority
    });

  } catch (error) {
    logger.error("Erro ao enviar notificação financeira por email:", error);
    throw error;
  }
}

/**
 * Gera o assunto do email de notificação financeira
 */
function generateFinancialEmailSubject(data: FinancialNotificationData): string {
  const typeText = data.type === 'PAYABLE' ? 'Conta a Pagar' : 'Conta a Receber';
  const priorityIcon = getPriorityIcon(data.priority);
  
  if (data.isOverdue) {
    return `${priorityIcon} VENCIDO - ${typeText}: ${data.description}`;
  }
  
  if (data.daysUntilDue === 0) {
    return `${priorityIcon} VENCE HOJE - ${typeText}: ${data.description}`;
  }
  
  if (data.daysUntilDue === 1) {
    return `${priorityIcon} VENCE AMANHÃ - ${typeText}: ${data.description}`;
  }
  
  return `${priorityIcon} Vencimento em ${data.daysUntilDue} dias - ${typeText}: ${data.description}`;
}

/**
 * Gera o HTML do email de notificação financeira
 */
function generateFinancialEmailHTML(data: FinancialNotificationData): string {
  const typeText = data.type === 'PAYABLE' ? 'Conta a Pagar' : 'Conta a Receber';
  const typeColor = data.type === 'PAYABLE' ? '#ef4444' : '#10b981';
  const priorityColor = getPriorityColor(data.priority);
  const priorityText = getPriorityText(data.priority);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  let statusBadge = '';
  let statusMessage = '';
  
  if (data.isOverdue) {
    statusBadge = `<span style="background-color: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">VENCIDO</span>`;
    statusMessage = `<p style="color: #dc2626; font-weight: bold; font-size: 16px;">⚠️ Esta conta está em atraso há ${Math.abs(data.daysUntilDue)} dias!</p>`;
  } else if (data.daysUntilDue === 0) {
    statusBadge = `<span style="background-color: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">VENCE HOJE</span>`;
    statusMessage = `<p style="color: #f59e0b; font-weight: bold; font-size: 16px;">📅 Esta conta vence hoje!</p>`;
  } else if (data.daysUntilDue === 1) {
    statusBadge = `<span style="background-color: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">VENCE AMANHÃ</span>`;
    statusMessage = `<p style="color: #f59e0b; font-weight: bold; font-size: 16px;">📅 Esta conta vence amanhã!</p>`;
  } else {
    statusBadge = `<span style="background-color: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">VENCE EM ${data.daysUntilDue} DIAS</span>`;
    statusMessage = `<p style="color: #3b82f6; font-weight: bold; font-size: 16px;">📅 Esta conta vence em ${data.daysUntilDue} dias</p>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notificação de Vencimento Financeiro</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0 0 10px 0; font-size: 28px;">💰 Notificação Financeira</h1>
        <p style="margin: 0; font-size: 18px; opacity: 0.9;">Sistema Cerrado Engenharia</p>
      </div>

      <div style="background-color: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h2 style="margin: 0; color: ${typeColor}; font-size: 24px;">${typeText}</h2>
          <div>
            ${statusBadge}
            <span style="background-color: ${priorityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 8px;">${priorityText}</span>
          </div>
        </div>
        
        ${statusMessage}
        
        <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; width: 30%;">Descrição:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.description}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Valor:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 18px; font-weight: bold; color: ${typeColor};">${formatCurrency(data.amount)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Data de Vencimento:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${formatDate(data.dueDate)}</td>
            </tr>
            ${data.clientName ? `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${data.type === 'PAYABLE' ? 'Fornecedor' : 'Cliente'}:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.clientName}</td>
            </tr>
            ` : ''}
            ${data.installmentInfo ? `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Parcela:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.installmentInfo.current} de ${data.installmentInfo.total}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px 0; font-weight: bold;">Responsável:</td>
              <td style="padding: 10px 0;">${data.responsibleUserName}</td>
            </tr>
          </table>
        </div>
      </div>

      <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 10px 0; color: #1e40af;">💡 Próximos Passos</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
          ${data.type === 'PAYABLE' ? `
            <li>Verifique o saldo disponível para o pagamento</li>
            <li>Confirme os dados bancários do fornecedor</li>
            <li>Processe o pagamento no sistema</li>
          ` : `
            <li>Entre em contato com o cliente para confirmação</li>
            <li>Prepare a documentação necessária</li>
            <li>Registre o recebimento no sistema</li>
          `}
          <li>Atualize o status no sistema após processamento</li>
        </ul>
      </div>

      <div style="text-align: center; padding: 20px; background-color: #f8fafc; border-radius: 10px; margin-top: 30px;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          📧 Esta notificação foi enviada automaticamente pelo sistema<br>
          🔔 Para alterar suas preferências de notificação, acesse o painel de configurações
        </p>
      </div>

      <div style="text-align: center; padding: 15px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">© 2024 Cerrado Engenharia - Sistema de Gestão Financeira</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Utilitários para formatação
 */
function getPriorityIcon(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.Urgente:
      return '🚨';
    case TaskPriority.Alta:
      return '⚠️';
    case TaskPriority.Média:
      return '📋';
    case TaskPriority.Baixa:
      return '📌';
    default:
      return '📄';
  }
}

function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.Urgente:
      return '#dc2626';
    case TaskPriority.Alta:
      return '#f59e0b';
    case TaskPriority.Média:
      return '#3b82f6';
    case TaskPriority.Baixa:
      return '#10b981';
    default:
      return '#6b7280';
  }
}

function getPriorityText(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.Urgente:
      return 'URGENTE';
    case TaskPriority.Alta:
      return 'ALTA';
    case TaskPriority.Média:
      return 'MÉDIA';
    case TaskPriority.Baixa:
      return 'BAIXA';
    default:
      return 'NORMAL';
  }
}

/**
 * Envia relatório diário de vencimentos
 */
export async function sendDailyFinancialReport(): Promise<void> {
  try {
    logger.info("Gerando relatório diário de vencimentos financeiros...");
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    // Busca vencimentos por período
    const [overduePayables, overduereceivables, todayDues, tomorrowDues, next7DaysDues] = await Promise.all([
      // Contas a pagar vencidas
      admin.firestore()
        .collection('accountsPayable')
        .where('status', '==', 'PENDENTE')
        .where('dueDate', '<', today)
        .get(),
      // Contas a receber vencidas
      admin.firestore()
        .collection('accountsReceivable')
        .where('status', '==', 'PENDENTE')
        .where('dueDate', '<', today)
        .get(),
      // Vencimentos hoje
      admin.firestore()
        .collectionGroup('installments')
        .where('status', '==', 'PENDENTE')
        .where('dueDate', '>=', today)
        .where('dueDate', '<', tomorrow)
        .get(),
      // Vencimentos amanhã
      admin.firestore()
        .collectionGroup('installments')
        .where('status', '==', 'PENDENTE')
        .where('dueDate', '>=', tomorrow)
        .where('dueDate', '<', next7Days)
        .get(),
      // Vencimentos próximos 7 dias
      admin.firestore()
        .collectionGroup('installments')
        .where('status', '==', 'PENDENTE')
        .where('dueDate', '>=', today)
        .where('dueDate', '<', next7Days)
        .get()
    ]);

    // Processa os dados para o relatório
    const reportData = {
      overdue: {
        payables: overduePayables.docs.length,
        receivables: overduereceivables.docs.length,
        totalAmount: [...overduePayables.docs, ...overduereceivables.docs]
          .reduce((sum, doc) => sum + doc.data().totalAmount, 0)
      },
      today: {
        count: todayDues.docs.length,
        amount: todayDues.docs.reduce((sum, doc) => sum + doc.data().amount, 0)
      },
      tomorrow: {
        count: tomorrowDues.docs.length,
        amount: tomorrowDues.docs.reduce((sum, doc) => sum + doc.data().amount, 0)
      },
      next7Days: {
        count: next7DaysDues.docs.length,
        amount: next7DaysDues.docs.reduce((sum, doc) => sum + doc.data().amount, 0)
      }
    };

    // Busca usuários que devem receber o relatório
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('financialReports', '==', true)
      .get();

    // Envia relatório para cada usuário
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      if (user.email) {
        await sendFinancialReportEmail(user.email, user.name, reportData);
      }
    }

    logger.info(`Relatório diário de vencimentos enviado para ${usersSnapshot.docs.length} usuários`);

  } catch (error) {
    logger.error("Erro ao gerar relatório diário de vencimentos:", error);
    throw error;
  }
}

/**
 * Envia email com relatório diário
 */
async function sendFinancialReportEmail(
  email: string, 
  name: string, 
  reportData: any
): Promise<void> {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const emailData: NotificationEmail = {
    to: email,
    message: {
      subject: `📊 Relatório Diário de Vencimentos - ${new Date().toLocaleDateString('pt-BR')}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório Diário de Vencimentos</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0 0 10px 0; font-size: 28px;">📊 Relatório Diário</h1>
            <p style="margin: 0; font-size: 18px; opacity: 0.9;">Vencimentos Financeiros</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h2 style="color: #374151;">Olá, ${name}!</h2>
            <p>Aqui está o resumo dos vencimentos financeiros para hoje:</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background-color: #fee2e2; padding: 20px; border-radius: 10px; border-left: 4px solid #dc2626;">
              <h3 style="margin: 0 0 10px 0; color: #dc2626;">🚨 Em Atraso</h3>
              <p style="margin: 0; font-size: 24px; font-weight: bold;">${reportData.overdue.payables + reportData.overdue.receivables}</p>
              <p style="margin: 5px 0 0 0; color: #7f1d1d; font-weight: bold;">${formatCurrency(reportData.overdue.totalAmount)}</p>
            </div>

            <div style="background-color: #fef3c7; padding: 20px; border-radius: 10px; border-left: 4px solid #f59e0b;">
              <h3 style="margin: 0 0 10px 0; color: #f59e0b;">📅 Vence Hoje</h3>
              <p style="margin: 0; font-size: 24px; font-weight: bold;">${reportData.today.count}</p>
              <p style="margin: 5px 0 0 0; color: #92400e; font-weight: bold;">${formatCurrency(reportData.today.amount)}</p>
            </div>

            <div style="background-color: #dbeafe; padding: 20px; border-radius: 10px; border-left: 4px solid #3b82f6;">
              <h3 style="margin: 0 0 10px 0; color: #3b82f6;">🔔 Próximos 7 Dias</h3>
              <p style="margin: 0; font-size: 24px; font-weight: bold;">${reportData.next7Days.count}</p>
              <p style="margin: 5px 0 0 0; color: #1e40af; font-weight: bold;">${formatCurrency(reportData.next7Days.amount)}</p>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; background-color: #f8fafc; border-radius: 10px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              📧 Este relatório é enviado automaticamente todos os dias<br>
              🔔 Para alterar suas preferências, acesse o painel de configurações
            </p>
          </div>

          <div style="text-align: center; padding: 15px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">© 2024 Cerrado Engenharia - Sistema de Gestão Financeira</p>
          </div>
        </body>
        </html>
      `
    }
  };

  await admin.firestore().collection('mail').add(emailData);
} 