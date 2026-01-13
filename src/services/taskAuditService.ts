import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { getDoc, doc } from 'firebase/firestore';

interface TaskAuditLog {
  action: string;
  performedBy: string;
  performedByName: string;
  performedOn: string;
  timestamp: any;
  details: string;
  entityType: 'task';
  changes?: Record<string, { from: any; to: any }>;
  taskTitle?: string;
  taskId?: string;
}

export const createTaskAuditLog = async (
  action: string, 
  details: string, 
  taskId: string, 
  taskTitle?: string,
  changes?: Record<string, { from: any; to: any }>
) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('❌ Usuário não autenticado - não é possível criar log de auditoria');
      return;
    }

    // Buscar nome do usuário atual
    let currentUserName = 'Usuário desconhecido';
    try {
      const currentUserDoc = await getDoc(doc(db, 'collaborators_unified', currentUser.uid));
      if (currentUserDoc.exists()) {
        const userData = currentUserDoc.data();
        currentUserName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 
                         currentUser.email || 'Usuário desconhecido';
      } else {
        currentUserName = currentUser.email || 'Usuário desconhecido';
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dados do usuário para auditoria:', error);
      currentUserName = currentUser.email || 'Usuário desconhecido';
    }

    const auditLog: TaskAuditLog = {
      action,
      performedBy: currentUser.uid,
      performedByName: currentUserName,
      performedOn: taskId,
      timestamp: serverTimestamp(),
      details,
      entityType: 'task',
      changes: changes || {},
      taskTitle: taskTitle,
      taskId: taskId
    };
    
    const docRef = await addDoc(collection(db, 'auditLogs'), auditLog);
    console.log('✅ Log de auditoria criado:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Erro ao criar log de auditoria:', error);
    throw error;
  }
};

// Constantes para ações de tarefas
export const TASK_ACTIONS = {
  CREATE_TASK: 'CREATE_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  DELETE_TASK: 'DELETE_TASK',
  CHANGE_STATUS: 'CHANGE_STATUS',
  ASSIGN_TASK: 'ASSIGN_TASK',
  CHANGE_PRIORITY: 'CHANGE_PRIORITY',
  UPDATE_DUE_DATE: 'UPDATE_DUE_DATE',
  MOVE_TASK: 'MOVE_TASK'
}; 