import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  TaskProcess, 
  ProcessStep, 
  ProcessStepStatus, 
  ProcessTransition, 
  ProcessNotification,
  ProcessMetrics 
} from '@/types';
import { toast } from 'sonner';
import { createNotification } from './notificationService';
import { whatsappNotificationService } from './whatsappNotificationService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProcessAttachment } from './processAttachmentService';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

const PROCESSES_COLLECTION = 'task-processes';
const STEPS_COLLECTION = 'process-steps';
const NOTIFICATIONS_COLLECTION = 'process-notifications';

// Utilitário para converter Timestamp do Firestore para Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

// Inicializar processo para uma tarefa
export const initializeTaskProcess = async (
  taskId: string, 
  initialAssigneeId: string,
  initialAssigneeName: string
): Promise<string> => {
  try {
    const batch = writeBatch(db);
    
    // Criar processo
    const processRef = doc(collection(db, PROCESSES_COLLECTION));
    const processData: Omit<TaskProcess, 'id'> = {
      taskId,
      steps: [],
      isCompleted: false,
      totalSteps: 1,
      totalTimeInProcess: 0,
      averageStepTime: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    batch.set(processRef, {
      ...processData,
      createdAt: Timestamp.fromDate(processData.createdAt),
      updatedAt: Timestamp.fromDate(processData.updatedAt)
    });
    
    // Criar primeiro step (responsável inicial)
    const firstStepRef = doc(collection(db, STEPS_COLLECTION));
    const firstStepData: Omit<ProcessStep, 'id'> = {
      taskId,
      fromUserId: 'system',
      fromUserName: 'Sistema',
      toUserId: initialAssigneeId,
      toUserName: initialAssigneeName,
      status: ProcessStepStatus.EmAnalise,
      notes: 'Responsável inicial da tarefa',
      createdAt: new Date(),
      timeInAnalysis: 0,
      timeInTransit: 0,
      requiresSignature: false,
      isActive: true
    };
    
    batch.set(firstStepRef, {
      ...firstStepData,
      createdAt: Timestamp.fromDate(firstStepData.createdAt)
    });
    
    await batch.commit();
    
    // Agora atualizar o processo com o currentStepId após o commit
    await updateDoc(processRef, {
      currentStepId: firstStepRef.id,
      updatedAt: Timestamp.fromDate(new Date())
    });
    
    return processRef.id;
  } catch (error) {
    console.error('Erro ao inicializar processo:', error);
    throw error;
  }
};

// Buscar processo de uma tarefa
export const getTaskProcess = async (taskId: string): Promise<TaskProcess | null> => {
  try {
    const q = query(
      collection(db, PROCESSES_COLLECTION),
      where('taskId', '==', taskId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const processDoc = querySnapshot.docs[0];
    const processData = processDoc.data();
    
    // Buscar steps do processo
    const stepsQuery = query(
      collection(db, STEPS_COLLECTION),
      where('taskId', '==', taskId),
      orderBy('createdAt', 'asc')
    );
    
    const stepsSnapshot = await getDocs(stepsQuery);
    const steps: ProcessStep[] = stepsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      transitedAt: doc.data().transitedAt ? timestampToDate(doc.data().transitedAt) : undefined,
      signedAt: doc.data().signedAt ? timestampToDate(doc.data().signedAt) : undefined,
      rejectedAt: doc.data().rejectedAt ? timestampToDate(doc.data().rejectedAt) : undefined,
    } as ProcessStep));
    
    return {
      id: processDoc.id,
      ...processData,
      steps,
      createdAt: timestampToDate(processData.createdAt),
      updatedAt: timestampToDate(processData.updatedAt),
    } as TaskProcess;
  } catch (error) {
    console.error('Erro ao buscar processo:', error);
    throw error;
  }
};

// Mover tarefa para outro usuário
export const forwardTask = async (
  taskId: string,
  fromUserId: string,
  fromUserName: string,
  toUserId: string,
  toUserName: string,
  toUserEmail: string,
  richNotes?: string, // Rich HTML content
  attachments?: ProcessAttachment[] // Anexos já processados
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Buscar processo atual
    const process = await getTaskProcess(taskId);
    if (!process) {
      throw new Error('Processo não encontrado para esta tarefa');
    }
    
    // Verificar se existe um step ativo (fluxo livre)
    const currentStep = process.steps.find(step => step.isActive) || process.steps[process.steps.length - 1];
    
    if (!currentStep) {
      throw new Error('Nenhum step encontrado para esta tarefa');
    }
    
    // Calcular tempo em análise do step atual
    const timeInAnalysis = Math.floor(
      (new Date().getTime() - currentStep.createdAt.getTime()) / (1000 * 60)
    );
    
    // Atualizar step atual como tramitado (concluída em análise)
    const currentStepRef = doc(db, STEPS_COLLECTION, currentStep.id);
    batch.update(currentStepRef, {
      status: ProcessStepStatus.EmAnalise, // Mantém como análise (concluída)
      transitedAt: Timestamp.fromDate(new Date()),
      timeInAnalysis,
      isActive: false,
      richNotes: richNotes || currentStep.richNotes || currentStep.notes,
      notes: richNotes || currentStep.notes // Texto para compatibilidade
    });
    
    // Criar novo step para o próximo responsável (em trânsito = aguardando assinatura)
    const newStepRef = doc(collection(db, STEPS_COLLECTION));
    const newStepData: Omit<ProcessStep, 'id'> = {
      taskId,
      fromUserId,
      fromUserName,
      toUserId,
      toUserName,
      status: ProcessStepStatus.EmTransito, // Novo responsável recebe em trânsito
      richNotes: richNotes || '',
      notes: richNotes || '', // Texto para compatibilidade
      attachments: attachments || [],
      createdAt: new Date(),
      timeInAnalysis: 0,
      timeInTransit: 0,
      requiresSignature: true,
      isActive: true
    };
    
    batch.set(newStepRef, {
      ...newStepData,
      createdAt: Timestamp.fromDate(newStepData.createdAt)
    });
    
    // Atualizar processo
    const processRef = doc(db, PROCESSES_COLLECTION, process.id);
    batch.update(processRef, {
      totalSteps: process.totalSteps + 1,
      updatedAt: Timestamp.fromDate(new Date())
    });
    
    // Atualizar a tarefa para o novo responsável
    const taskRef = doc(db, 'tasks', taskId);
    batch.update(taskRef, {
      assignedTo: toUserId,
      assignedToName: toUserName,
      updatedAt: Timestamp.fromDate(new Date())
    });
    
    await batch.commit();
    
    // Atualizar processo com o novo currentStepId após o commit
    await updateDoc(processRef, {
      currentStepId: newStepRef.id,
      updatedAt: Timestamp.fromDate(new Date())
    });
    
    // Criar notificação in-app para o destinatário
    try {
      await createNotification(toUserId, {
        title: 'Nova tarefa recebida',
        message: `Você recebeu uma nova tarefa de ${fromUserName}. ${richNotes ? 'Observações: ' + richNotes : ''}`,
        type: 'task'
      });
    } catch (notificationError) {
      console.error('Erro ao criar notificação:', notificationError);
      // Não falha o processo se a notificação não for criada
    }

    // Enviar notificações por email e WhatsApp de tramitação
    try {
      console.log('🔄 Iniciando notificações de tramitação...');
      
      // Buscar dados da tarefa para enviar informações completas
      const taskDoc = await getDoc(doc(db, 'tasks', taskId));
      const taskData = taskDoc.data();
      
      console.log('📧 Dados para envio:', {
        taskId,
        taskTitle: taskData?.title,
        fromUser: fromUserName,
        toUser: toUserName,
        toEmail: toUserEmail,
        priority: taskData?.priority,
        clientName: taskData?.clientName
      });
      
      // Email notification
      try {
        // Validar dados obrigatórios antes de chamar a função
        if (!taskId || !fromUserName || !toUserName || !toUserEmail) {
          throw new Error('Dados obrigatórios faltando para envio de email');
        }
        
        const notifyTramitationFn = httpsCallable(functions, 'notifyTaskTramitation');
        
        const emailData = {
          taskId,
          taskTitle: taskData?.title || 'Tarefa',
          priority: taskData?.priority || 'Média',
          fromUserId,
          fromUserName,
          toUserId,
          toUserName,
          toUserEmail,
          richNotes: richNotes || '',
          attachments: attachments || [],
          clientName: taskData?.clientName || null
        };
        
        console.log('📤 Chamando função de email com dados:', emailData);
        
        const result = await notifyTramitationFn(emailData);
        
        console.log('✅ Notificação de email enviada com sucesso:', result);
        toast.success('Email de tramitação enviado com sucesso!');
      } catch (emailError) {
        console.error('❌ Erro ao enviar notificação por email:', emailError);
        console.error('❌ Stack trace:', emailError.stack);
        toast.error('Falha no envio de email: ' + (emailError.message || 'Erro desconhecido'));
      }
      
      // WhatsApp notification (async, non-blocking)
      setTimeout(async () => {
        try {
          console.log('📱 Enviando notificação WhatsApp de tramitação...');
          
          // Format due date if available
          let dueDateFormatted = 'Não definido';
          if (taskData?.dueDate) {
            try {
              const dueDate = taskData.dueDate.toDate ? taskData.dueDate.toDate() : new Date(taskData.dueDate);
              dueDateFormatted = format(dueDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
            } catch (dateError) {
              console.warn('Erro ao formatar data:', dateError);
            }
          }
          
          // Create task forwarding notification
          const notification = whatsappNotificationService.createTaskForwardingNotification({
            taskId,
            title: taskData?.title || 'Tarefa',
            fromUserName,
            toUserId,
            notes: richNotes || 'Sem observações',
            dueDate: dueDateFormatted,
            priority: taskData?.priority || 'Média',
            clientName: taskData?.clientName || 'Não especificado'
          });
          
          // Send notification
          const result = await whatsappNotificationService.sendNotification(notification);
          
          if (result.success) {
            console.log('✅ Notificação WhatsApp de tramitação enviada com sucesso');
          } else {
            console.warn('⚠️ Falha no envio da notificação WhatsApp:', result.error);
          }
        } catch (whatsappError) {
          console.error('❌ Erro ao enviar notificação WhatsApp:', whatsappError);
          // Não falha o processo se a notificação WhatsApp falhar
        }
      }, 1500); // Delay para não interferir com outras operações
      
    } catch (error) {
      console.error('❌ Erro geral nas notificações:', error);
      // Continua o processo mesmo se as notificações falharem
    }
    
    toast.success('Tarefa movida com sucesso!');
  } catch (error) {
    console.error('Erro ao mover tarefa:', error);
    toast.error('Erro ao mover tarefa');
    throw error;
  }
};

// Assinar/aceitar tarefa
export const signTask = async (
  taskId: string,
  userId: string,
  richNotes?: string,
  attachments?: ProcessAttachment[]
): Promise<void> => {
  try {
    const process = await getTaskProcess(taskId);
    if (!process) {
      throw new Error('Processo não encontrado');
    }
    
    // Buscar o step ativo mais recente (fluxo livre)
    const currentStep = process.steps.find(step => step.isActive) || process.steps[process.steps.length - 1];
    if (!currentStep) {
      throw new Error('Nenhum step encontrado para esta tarefa');
    }
    
    const timeInAnalysis = Math.floor(
      (new Date().getTime() - currentStep.createdAt.getTime()) / (1000 * 60)
    );
    
    const stepRef = doc(db, STEPS_COLLECTION, currentStep.id);
    await updateDoc(stepRef, {
      status: ProcessStepStatus.EmAnalise, // Volta para "Em análise" após assinatura
      signedAt: Timestamp.fromDate(new Date()), // Registra que foi assinado
      timeInAnalysis,
      richNotes: richNotes || currentStep.richNotes || currentStep.notes,
      notes: richNotes || currentStep.notes,
      attachments: attachments || currentStep.attachments || []
    });
    
    toast.success('Tarefa assinada com sucesso!');
  } catch (error) {
    console.error('Erro ao assinar tarefa:', error);
    toast.error('Erro ao assinar tarefa');
    throw error;
  }
};

// Rejeitar tarefa e voltar ao responsável anterior
export const rejectTask = async (
  taskId: string,
  userId: string,
  reason: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const process = await getTaskProcess(taskId);
    if (!process) {
      throw new Error('Processo não encontrado');
    }
    
    // Buscar o step ativo atual
    const currentStep = process.steps.find(step => step.isActive);
    if (!currentStep) {
      throw new Error('Nenhum step ativo encontrado');
    }
    
    // CORREÇÃO: Buscar quem ENVIOU para o step atual (fromUserId do step atual)
    // O responsável anterior é quem está no campo fromUserId do step atual
    const previousUserId = currentStep.fromUserId;
    const previousUserName = currentStep.fromUserName;
    
    if (!previousUserId || previousUserId === 'system') {
      throw new Error('Não é possível rejeitar para o sistema. A tarefa deve ser rejeitada para um usuário específico.');
    }
    
    const timeInAnalysis = Math.floor(
      (new Date().getTime() - currentStep.createdAt.getTime()) / (1000 * 60)
    );
    
    // Atualizar step atual como rejeitado
    const currentStepRef = doc(db, STEPS_COLLECTION, currentStep.id);
    batch.update(currentStepRef, {
      status: ProcessStepStatus.Rejeitado,
      rejectedAt: Timestamp.fromDate(new Date()),
      timeInAnalysis,
      notes: reason,
      isActive: false
    });
    
    // Criar novo step voltando para o responsável anterior
    const returnStepRef = doc(collection(db, STEPS_COLLECTION));
    const returnStepData: Omit<ProcessStep, 'id'> = {
      taskId,
      fromUserId: userId,
      fromUserName: currentStep.toUserName,
      toUserId: previousUserId,
      toUserName: previousUserName,
      status: ProcessStepStatus.EmAnalise,
      notes: `Tarefa rejeitada e retornada. Motivo: ${reason}`,
      createdAt: new Date(),
      timeInAnalysis: 0,
      timeInTransit: 0,
      requiresSignature: false,
      isActive: true
    };
    
    batch.set(returnStepRef, {
      ...returnStepData,
      createdAt: Timestamp.fromDate(returnStepData.createdAt)
    });
    
    // Atualizar processo
    const processRef = doc(db, PROCESSES_COLLECTION, process.id);
    batch.update(processRef, {
      currentStepId: returnStepRef.id,
      totalSteps: process.totalSteps + 1,
      updatedAt: Timestamp.fromDate(new Date())
    });
    
    // Atualizar a tarefa para o responsável anterior
    const taskRef = doc(db, 'tasks', taskId);
    batch.update(taskRef, {
      assignedTo: previousUserId,
      assignedToName: previousUserName,
      updatedAt: Timestamp.fromDate(new Date())
    });
    
    await batch.commit();
    
    // Buscar dados do usuário que receberá a notificação de rejeição
    let destinatario = null;
    try {
      const userDoc = await getDoc(doc(db, 'collaborators_unified', previousUserId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        destinatario = {
          email: userData.email,
          nome: `${userData.firstName} ${userData.lastName}`.trim()
        };
      }
    } catch (error) {
      console.error('Erro ao buscar dados do destinatário:', error);
    }

    // Buscar dados da tarefa para notificação
    let taskData = null;
    try {
      const taskDoc = await getDoc(doc(db, 'tasks', taskId));
      if (taskDoc.exists()) {
        taskData = taskDoc.data();
      }
    } catch (error) {
      console.error('Erro ao buscar dados da tarefa:', error);
    }

    // Enviar notificações de rejeição por email e WhatsApp se tivermos os dados necessários
    if (destinatario && destinatario.email && taskData) {
      try {
        console.log('🔄 Iniciando notificações de rejeição...');
        
        // Email notification de rejeição
        try {
          const notifyRejectionFn = httpsCallable(functions, 'sendTaskRejectionAlert');
          
                     const rejectionData = {
             taskId,
             taskTitle: taskData.title || 'Tarefa',
             priority: taskData.priority || 'Média',
             fromUserId: userId,
             fromUserName: currentStep.toUserName,
             fromUserEmail: '',
             toUserId: previousUserId,
             toUserName: destinatario.nome,
             toUserEmail: destinatario.email,
             rejectionReason: reason,
             clientName: taskData.clientName || null
           };
          
          console.log('📤 Chamando função de email de rejeição com dados:', rejectionData);
          
          const result = await notifyRejectionFn(rejectionData);
          
          console.log('✅ Notificação de rejeição por email enviada com sucesso:', result);
          toast.success('Email de rejeição enviado com sucesso!');
        } catch (emailError) {
          console.error('❌ Erro ao enviar notificação de rejeição por email:', emailError);
          toast.error('Falha no envio de email de rejeição: ' + (emailError.message || 'Erro desconhecido'));
        }
        
        // WhatsApp notification de rejeição (async, non-blocking)
        setTimeout(async () => {
          try {
            console.log('📱 Enviando notificação WhatsApp de rejeição...');
            
            // Format due date if available
            let dueDateFormatted = 'Não definido';
            if (taskData.dueDate) {
              try {
                const dueDate = taskData.dueDate.toDate ? taskData.dueDate.toDate() : new Date(taskData.dueDate);
                dueDateFormatted = format(dueDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
              } catch (dateError) {
                console.warn('Erro ao formatar data:', dateError);
              }
            }
            
            // Create task rejection notification
            const notification = whatsappNotificationService.createTaskRejectionNotification({
              taskId,
              title: taskData.title || 'Tarefa',
              fromUserName: currentStep.toUserName,
              toUserId: previousUserId,
              reason: reason,
              dueDate: dueDateFormatted,
              priority: taskData.priority || 'Média',
              clientName: taskData.clientName || 'Não especificado'
            });
            
            // Send notification
            const result = await whatsappNotificationService.sendNotification(notification);
            
            if (result.success) {
              console.log('✅ Notificação WhatsApp de rejeição enviada com sucesso');
            } else {
              console.warn('⚠️ Falha no envio da notificação WhatsApp de rejeição:', result.error);
            }
          } catch (whatsappError) {
            console.error('❌ Erro ao enviar notificação WhatsApp de rejeição:', whatsappError);
            // Não falha o processo se a notificação WhatsApp falhar
          }
        }, 1500); // Delay para não interferir com outras operações
        
      } catch (error) {
        console.error('❌ Erro geral nas notificações de rejeição:', error);
        // Continua o processo mesmo se as notificações falharem
      }
    } else {
      console.warn('⚠️ Dados insuficientes para enviar notificações de rejeição');
    }
    
    toast.success('Tarefa rejeitada e retornada ao responsável anterior!');
  } catch (error) {
    console.error('Erro ao rejeitar tarefa:', error);
    toast.error('Erro ao rejeitar tarefa');
    throw error;
  }
};

// Calcular métricas do processo
export const calculateProcessMetrics = async (taskId: string): Promise<ProcessMetrics | null> => {
  try {
    const process = await getTaskProcess(taskId);
    if (!process) {
      return null;
    }
    
    const completedSteps = process.steps.filter(step => 
      step.signedAt || // Tem assinatura registrada
      step.status === ProcessStepStatus.Rejeitado
    );
    
    if (completedSteps.length === 0) {
      return {
        taskId,
        totalProcessTime: 0,
        averageStepTime: 0,
        bottlenecks: [],
        fastestUser: { userId: '', userName: '', averageTime: 0 },
        slowestUser: { userId: '', userName: '', averageTime: 0 }
      };
    }
    
    const totalTime = completedSteps.reduce((sum, step) => sum + (step.timeInAnalysis || 0), 0);
    const averageTime = totalTime / completedSteps.length;
    
    // Agrupar por usuário para identificar gargalos
    const userStats = new Map<string, { name: string; times: number[]; count: number }>();
    
    completedSteps.forEach(step => {
      if (!userStats.has(step.toUserId)) {
        userStats.set(step.toUserId, {
          name: step.toUserName,
          times: [],
          count: 0
        });
      }
      
      const userStat = userStats.get(step.toUserId)!;
      userStat.times.push(step.timeInAnalysis || 0);
      userStat.count++;
    });
    
    const bottlenecks = Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        userId,
        userName: stats.name,
        averageTime: stats.times.reduce((a, b) => a + b, 0) / stats.times.length,
        stepCount: stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime);
    
    const fastest = bottlenecks[bottlenecks.length - 1] || { userId: '', userName: '', averageTime: 0 };
    const slowest = bottlenecks[0] || { userId: '', userName: '', averageTime: 0 };
    
    return {
      taskId,
      totalProcessTime: totalTime,
      averageStepTime: averageTime,
      bottlenecks: bottlenecks.slice(0, 3), // Top 3 gargalos
      fastestUser: fastest,
      slowestUser: slowest
    };
  } catch (error) {
    console.error('Erro ao calcular métricas:', error);
    return null;
  }
};

// Buscar tarefas pendentes de assinatura para um usuário
export const getPendingTasksForUser = async (userId: string): Promise<ProcessStep[]> => {
  try {
    const q = query(
      collection(db, STEPS_COLLECTION),
      where('toUserId', '==', userId),
      where('isActive', '==', true),
      where('requiresSignature', '==', true),
      where('status', '==', ProcessStepStatus.EmTransito)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToDate(doc.data().createdAt),
      transitedAt: doc.data().transitedAt ? timestampToDate(doc.data().transitedAt) : undefined,
    } as ProcessStep));
  } catch (error) {
    console.error('Erro ao buscar tarefas pendentes:', error);
    throw error;
  }
}; 