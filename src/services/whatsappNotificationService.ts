import { db } from '@/config/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { zapiService } from './zapiService';
import { whatsappLogService } from './whatsappLogService';

export interface WhatsAppNotification {
  type: 'task_assignment' | 'task_deadline' | 'meeting_reminder' | 'expense_approval' | 'system_announcement' | 'task_rejection';
  title: string;
  message: string;
  recipientId: string;
  recipientPhone?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: Date;
  metadata?: {
    taskId?: string;
    eventId?: string;
    expenseId?: string;
    clientId?: string;
    taskTitle?: string;
    taskDescription?: string;
    dueDate?: string;
    priority?: string;
    clientName?: string;
    userName?: string;
    managerName?: string;
    protocol?: string;
    requesterName?: string;
    amount?: string;
    category?: string;
    description?: string;
    announcement?: string;
    eventTitle?: string;
    startDate?: string;
    startTime?: string;
    location?: string;
    timeRemaining?: string;
    reason?: string;
  };
}

export interface WhatsAppTemplate {
  type: WhatsAppNotification['type'];
  template: (data: any) => {
    title: string;
    message: string;
  };
}

class WhatsAppNotificationService {
  // Templates de mensagens predefinidos
  private templates: WhatsAppTemplate[] = [
    {
      type: 'task_assignment',
      template: (data) => ({
        title: data.userName ? '🔄 Tarefa Tramitada' : '📋 Nova Tarefa Atribuída',
        message: `Olá! 

${data.userName ? 
  `Você recebeu uma tarefa tramitada por *${data.userName}*:` : 
  'Uma nova tarefa foi atribuída para você:'}

📌 *Título:* ${data.taskTitle}
📝 *Descrição:* ${data.taskDescription || data.description || 'Sem descrição'}
📅 *Prazo:* ${data.dueDate}
⚡ *Prioridade:* ${data.priority}
👤 *Cliente:* ${data.clientName || 'Não especificado'}

${data.userName && data.description ? 
  `📋 *Observações:* ${data.description}\n\n` : 
  ''}Acesse o sistema para mais detalhes.

*Sistema Cerrado Engenharia*`
      })
    },
    {
      type: 'task_deadline',
      template: (data) => ({
        title: '⏰ Lembrete de Prazo',
        message: `Olá ${data.userName}! 

Lembrete: A tarefa "${data.taskTitle}" tem prazo para hoje!

📅 *Vence em:* ${data.timeRemaining}
⚡ *Prioridade:* ${data.priority}
👤 *Cliente:* ${data.clientName || 'Não especificado'}

Não esqueça de concluir dentro do prazo.

*Sistema Cerrado Engenharia*`
      })
    },
    {
      type: 'meeting_reminder',
      template: (data) => ({
        title: '📅 Lembrete de Reunião',
        message: `Olá ${data.userName}! 

Você tem uma reunião agendada:

🏢 *Evento:* ${data.eventTitle}
📅 *Data:* ${data.startDate}
⏰ *Horário:* ${data.startTime}
📍 *Local:* ${data.location || 'Não especificado'}
👤 *Cliente:* ${data.clientName || 'Interno'}

Prepare-se para a reunião!

*Sistema Cerrado Engenharia*`
      })
    },
    {
      type: 'expense_approval',
      template: (data) => ({
        title: '💰 Solicitação de Despesa',
        message: `Olá ${data.managerName}! 

Nova solicitação de despesa para aprovação:

📋 *Protocolo:* ${data.protocol}
👤 *Solicitante:* ${data.requesterName}
💵 *Valor:* R$ ${data.amount}
📂 *Categoria:* ${data.category}
📄 *Descrição:* ${data.description}

Acesse o sistema para analisar.

*Sistema Cerrado Engenharia*`
      })
    },
    {
      type: 'system_announcement',
      template: (data) => ({
        title: '📢 Comunicado do Sistema',
        message: `Olá ${data.userName}! 

${data.announcement}

*Sistema Cerrado Engenharia*`
      })
    },
    {
      type: 'task_rejection',
      template: (data) => ({
        title: '❌ Tramitação Rejeitada!',
        message: `Olá! 

❌ *Sua tarefa foi REJEITADA* por *${data.userName}*:

📌 *Título:* ${data.taskTitle}
📅 *Prazo:* ${data.dueDate}
⚡ *Prioridade:* ${data.priority}
👤 *Cliente:* ${data.clientName}

🚫 *Motivo da Rejeição:*
${data.reason}

⚠️ *A tarefa retornou para você. Revise o motivo da rejeição, faça as correções necessárias e tramite novamente.*

Acesse o sistema para mais detalhes.

*Sistema Cerrado Engenharia*`
      })
    }
  ];

  // Formatar número de telefone para Z-API
  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Se não começar com 55 (Brasil), adiciona
    if (!cleanPhone.startsWith('55')) {
      return `55${cleanPhone}`;
    }
    
    return cleanPhone;
  }

  // Verificar se o Z-API está configurado
  private async isZApiConfigured(): Promise<boolean> {
    try {
      return await zapiService.isConfigured();
    } catch (error) {
      console.error('Erro ao verificar configuração Z-API:', error);
      return false;
    }
  }

  // Buscar colaborador por ID
  private async getCollaboratorById(collaboratorId: string) {
    try {
      // Primeiro tentar na coleção unificada
      const unifiedDoc = await getDoc(doc(db, 'collaborators_unified', collaboratorId));
      if (unifiedDoc.exists()) {
        return { id: unifiedDoc.id, ...unifiedDoc.data() };
      }

      // Fallback: buscar nas coleções antigas
      const collaboratorDoc = await getDoc(doc(db, 'collaborators', collaboratorId));
      if (collaboratorDoc.exists()) {
        return { id: collaboratorDoc.id, ...collaboratorDoc.data() };
      }

      const userDoc = await getDoc(doc(db, 'collaborators_unified', collaboratorId));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar colaborador:', error);
      return null;
    }
  }

  // Buscar colaboradores por níveis de hierarquia
  async getCollaboratorsByHierarchy(hierarchyLevels: string[]) {
    try {
      const collaborators: any[] = [];

      // Primeiro buscar na coleção unificada
      const unifiedQuery = query(
        collection(db, 'collaborators_unified'),
        where('hierarchyLevel', 'in', hierarchyLevels)
      );
      const unifiedSnapshot = await getDocs(unifiedQuery);
      
      unifiedSnapshot.docs.forEach(doc => {
        const data = doc.data();
        collaborators.push({
          id: doc.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          hierarchyLevel: data.hierarchyLevel
        });
      });

      // Se a coleção unificada tem dados, usar ela
      if (collaborators.length > 0) {
        console.log(`✅ WhatsApp: Usando coleção unificada - ${collaborators.length} colaboradores encontrados`);
        return collaborators;
      }

      // Fallback: usar as coleções antigas
      console.log('⚠️ WhatsApp: Fallback para coleções antigas');

      // Buscar em collaborators
      const collaboratorsQuery = query(
        collection(db, 'collaborators'),
        where('hierarchyLevel', 'in', hierarchyLevels)
      );
      const collaboratorsSnapshot = await getDocs(collaboratorsQuery);
      
      collaboratorsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        collaborators.push({
          id: doc.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          hierarchyLevel: data.hierarchyLevel
        });
      });

      // Não há mais coleção users separada
      // const usersQuery = query(
      //   collection(db, 'users'),
      //   where('hierarchyLevel', 'in', hierarchyLevels)
      // );
      // const usersSnapshot = await getDocs(usersQuery);
      // 
      // usersSnapshot.docs.forEach(doc => {
      //   const data = doc.data();
      //   // Evitar duplicatas
      //   if (!collaborators.find(c => c.id === doc.id)) {
      //     collaborators.push({
      //       id: doc.id,
      //       firstName: data.firstName,
      //       lastName: data.lastName,
      //       email: data.email,
      //       phone: data.phone,
      //       whatsapp: data.whatsapp,
      //       hierarchyLevel: data.hierarchyLevel
      //     });
      //   }
      // });

      return collaborators;
    } catch (error) {
      console.error('Erro ao buscar colaboradores por hierarquia:', error);
      return [];
    }
  }

  // Enviar notificação para um colaborador
  async sendNotification(notification: WhatsAppNotification): Promise<{ success: boolean; error?: string }> {
    let collaborator: any = null;
    let whatsappNumber: string = '';
    let formattedPhone: string = '';
    let title: string = '';
    let message: string = '';

    try {
      // Verificar se Z-API está configurado
      if (!(await this.isZApiConfigured())) {
        const error = 'Z-API não configurado';
        console.warn('Z-API não está configurado, notificação WhatsApp ignorada');
        
        // Log da falha
        await whatsappLogService.logFailure(
          notification.recipientId,
          'Colaborador não identificado',
          'N/A',
          notification.type,
          notification.title,
          'Mensagem não gerada',
          error,
          notification.metadata
        );
        
        return { success: false, error };
      }

      // Buscar dados do colaborador
      collaborator = await this.getCollaboratorById(notification.recipientId);
      if (!collaborator) {
        const error = 'Colaborador não encontrado';
        
        // Log da falha
        await whatsappLogService.logFailure(
          notification.recipientId,
          'Colaborador não encontrado',
          'N/A',
          notification.type,
          notification.title,
          'Mensagem não gerada',
          error,
          notification.metadata
        );
        
        return { success: false, error };
      }

      // Verificar se tem WhatsApp cadastrado
      whatsappNumber = notification.recipientPhone || collaborator.whatsapp;
      if (!whatsappNumber) {
        const error = 'WhatsApp não cadastrado';
        console.warn(`Colaborador ${collaborator.firstName} não tem WhatsApp cadastrado`);
        
        // Log da falha
        await whatsappLogService.logFailure(
          notification.recipientId,
          `${collaborator.firstName} ${collaborator.lastName}`,
          'N/A',
          notification.type,
          notification.title,
          'Mensagem não gerada',
          error,
          notification.metadata
        );
        
        return { success: false, error };
      }

      // Formatar número
      formattedPhone = this.formatPhoneNumber(whatsappNumber);

      // Buscar template
      const template = this.templates.find(t => t.type === notification.type);
      if (!template) {
        const error = 'Template não encontrado';
        
        // Log da falha
        await whatsappLogService.logFailure(
          notification.recipientId,
          `${collaborator.firstName} ${collaborator.lastName}`,
          formattedPhone,
          notification.type,
          notification.title,
          'Mensagem não gerada',
          error,
          notification.metadata
        );
        
        return { success: false, error };
      }

      // Gerar mensagem a partir do template
      const templateData = {
        userName: `${collaborator.firstName} ${collaborator.lastName}`,
        ...notification.metadata
      };
      
      const templateResult = template.template(templateData);
      title = templateResult.title;
      message = templateResult.message;

      // Enviar via Z-API
      const result = await zapiService.sendText({
        phone: formattedPhone,
        message: message,
        delayTyping: 2,
        delayMessage: 1
      });

      console.log(`✅ Notificação WhatsApp enviada para ${collaborator.firstName}:`, result);
      
      // Log do sucesso
      await whatsappLogService.logSuccess(
        notification.recipientId,
        `${collaborator.firstName} ${collaborator.lastName}`,
        formattedPhone,
        notification.type,
        title,
        message,
        notification.metadata,
        result
      );
      
      return { success: true };

    } catch (error) {
      console.error('Erro ao enviar notificação WhatsApp:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Log da falha
      try {
        await whatsappLogService.logFailure(
          notification.recipientId,
          collaborator ? `${collaborator.firstName} ${collaborator.lastName}` : 'Colaborador não identificado',
          formattedPhone || whatsappNumber || 'N/A',
          notification.type,
          title || notification.title,
          message || 'Mensagem não gerada',
          errorMessage,
          notification.metadata
        );
      } catch (logError) {
        console.error('Erro ao registrar log de falha:', logError);
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  // Enviar notificação para múltiplos colaboradores
  async sendBulkNotification(
    notifications: WhatsAppNotification[]
  ): Promise<{ 
    successful: number; 
    failed: number; 
    results: { success: boolean; error?: string; recipientId: string }[] 
  }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const notification of notifications) {
      const result = await this.sendNotification(notification);
      results.push({
        ...result,
        recipientId: notification.recipientId
      });

      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Pequeno delay entre envios para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { successful, failed, results };
  }

  // Enviar notificação para hierarquias específicas
  async sendNotificationToHierarchy(
    hierarchyLevels: string[],
    notificationTemplate: Omit<WhatsAppNotification, 'recipientId' | 'recipientPhone'>
  ): Promise<{ successful: number; failed: number; total: number }> {
    try {
      const collaborators = await this.getCollaboratorsByHierarchy(hierarchyLevels);
      
      if (collaborators.length === 0) {
        console.warn('Nenhum colaborador encontrado para as hierarquias especificadas');
        return { successful: 0, failed: 0, total: 0 };
      }

      const notifications: WhatsAppNotification[] = collaborators.map(collab => ({
        ...notificationTemplate,
        recipientId: collab.id,
        recipientPhone: collab.whatsapp
      }));

      const result = await this.sendBulkNotification(notifications);
      
      return {
        successful: result.successful,
        failed: result.failed,
        total: collaborators.length
      };

    } catch (error) {
      console.error('Erro ao enviar notificações para hierarquia:', error);
      return { successful: 0, failed: 0, total: 0 };
    }
  }

  // Criar notificação de nova tarefa
  createTaskAssignmentNotification(taskData: any): WhatsAppNotification {
    return {
      type: 'task_assignment',
      title: '📋 Nova Tarefa Atribuída',
      message: '', // Será gerado pelo template
      recipientId: taskData.assignedTo,
      priority: this.mapPriorityToNotification(taskData.priority),
      metadata: {
        taskId: taskData.id,
        taskTitle: taskData.title,
        taskDescription: taskData.description,
        dueDate: taskData.dueDate,
        priority: taskData.priority,
        clientName: taskData.clientName
      }
    };
  }

  // Criar notificação de lembrete de prazo
  createDeadlineReminderNotification(taskData: any): WhatsAppNotification {
    return {
      type: 'task_deadline',
      title: '⏰ Lembrete de Prazo',
      message: '', // Será gerado pelo template
      recipientId: taskData.assignedTo,
      priority: 'high',
      metadata: {
        taskId: taskData.id,
        taskTitle: taskData.title,
        timeRemaining: taskData.timeRemaining,
        priority: taskData.priority,
        clientName: taskData.clientName
      }
    };
  }

  // Criar notificação de lembrete de reunião
  createMeetingReminderNotification(eventData: any): WhatsAppNotification {
    return {
      type: 'meeting_reminder',
      title: '📅 Lembrete de Reunião',
      message: '', // Será gerado pelo template
      recipientId: eventData.ownerId,
      priority: 'medium',
      metadata: {
        eventId: eventData.id,
        eventTitle: eventData.title,
        startDate: eventData.startDate,
        startTime: eventData.startTime,
        location: eventData.location,
        clientName: eventData.clientName
      }
    };
  }

  // Criar notificação de aprovação de despesa
  createExpenseApprovalNotification(expenseData: any, managerId: string): WhatsAppNotification {
    return {
      type: 'expense_approval',
      title: '💰 Solicitação de Despesa',
      message: '', // Será gerado pelo template
      recipientId: managerId,
      priority: this.mapUrgencyToNotification(expenseData.urgency),
      metadata: {
        expenseId: expenseData.id,
        protocol: expenseData.protocol,
        requesterName: expenseData.requesterName,
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description
      }
    };
  }

  // Mapear prioridade da tarefa para prioridade da notificação
  private mapPriorityToNotification(taskPriority: string): WhatsAppNotification['priority'] {
    switch (taskPriority) {
      case 'Urgente': return 'urgent';
      case 'Alta': return 'high';
      case 'Média': return 'medium';
      case 'Baixa': return 'low';
      default: return 'medium';
    }
  }

  // Mapear urgência da despesa para prioridade da notificação
  private mapUrgencyToNotification(urgency: string): WhatsAppNotification['priority'] {
    switch (urgency) {
      case 'Urgente': return 'urgent';
      case 'Alta': return 'high';
      case 'Média': return 'medium';
      case 'Baixa': return 'low';
      default: return 'medium';
    }
  }

  // Criar notificação de tramitação de tarefa
  createTaskForwardingNotification(forwardingData: any): WhatsAppNotification {
    return {
      type: 'task_assignment',
      title: '🔄 Tarefa Tramitada',
      message: `Olá! 

Você recebeu uma tarefa tramitada por *${forwardingData.fromUserName}*:

📌 *Título:* ${forwardingData.title}
📅 *Prazo:* ${forwardingData.dueDate}
⚡ *Prioridade:* ${forwardingData.priority}
👤 *Cliente:* ${forwardingData.clientName}

${forwardingData.notes ? 
  `📋 *Observações:* ${forwardingData.notes}\n\n` : 
  ''}Acesse o sistema para mais detalhes.

*Sistema Cerrado Engenharia*`,
      recipientId: forwardingData.toUserId,
      priority: this.mapPriorityToNotification(forwardingData.priority),
      metadata: {
        taskId: forwardingData.taskId,
        taskTitle: forwardingData.title,
        dueDate: forwardingData.dueDate,
        priority: forwardingData.priority,
        clientName: forwardingData.clientName,
        userName: forwardingData.fromUserName
      }
    };
  }

  createTaskRejectionNotification(rejectionData: any): WhatsAppNotification {
    return {
      type: 'task_rejection',
      title: '❌ Tramitação Rejeitada!',
      message: '', // Será gerado pelo template
      recipientId: rejectionData.toUserId,
      priority: this.mapPriorityToNotification(rejectionData.priority),
      metadata: {
        taskId: rejectionData.taskId,
        taskTitle: rejectionData.title,
        dueDate: rejectionData.dueDate,
        priority: rejectionData.priority,
        clientName: rejectionData.clientName,
        userName: rejectionData.fromUserName,
        reason: rejectionData.reason
      }
    };
  }
}

// Instância singleton
export const whatsappNotificationService = new WhatsAppNotificationService(); 