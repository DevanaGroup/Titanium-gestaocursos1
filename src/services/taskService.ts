import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Task, TaskStatus } from '@/types';
import { whatsappNotificationService } from './whatsappNotificationService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TASKS_COLLECTION = 'tasks';

// Convert Firestore timestamps to JavaScript Date objects
const convertTimestamp = (task: any): Task => {
  return {
    ...task,
    dueDate: task.dueDate instanceof Timestamp 
      ? task.dueDate.toDate() 
      : new Date(task.dueDate),
    completedAt: task.completedAt instanceof Timestamp 
      ? task.completedAt.toDate() 
      : task.completedAt ? new Date(task.completedAt) : undefined,
    createdAt: task.createdAt instanceof Timestamp 
      ? task.createdAt.toDate() 
      : new Date(task.createdAt),
    updatedAt: task.updatedAt instanceof Timestamp 
      ? task.updatedAt.toDate() 
      : new Date(task.updatedAt)
  };
};

export const getTasks = async (): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, TASKS_COLLECTION),
      orderBy("dueDate", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return convertTimestamp({
        id: doc.id,
        ...data
      });
    });
  } catch (error) {
    console.error('Error getting tasks:', error);
    throw error;
  }
};

export const getTaskById = async (id: string): Promise<Task | null> => {
  try {
    const docRef = doc(db, TASKS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return convertTimestamp({
        id: docSnap.id,
        ...data
      });
    }
    
    return null;
  } catch (error) {
    console.error('Error getting task by ID:', error);
    throw error;
  }
};

export const getTasksByAssignee = async (assignedTo: string): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where("assignedTo", "==", assignedTo)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return convertTimestamp({
          id: doc.id,
          ...data
        });
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  } catch (error) {
    console.error('Error getting tasks by assignee:', error);
    throw error;
  }
};

export const getTasksByClient = async (clientId: string): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where("clientId", "==", clientId)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return convertTimestamp({
          id: doc.id,
          ...data
        });
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  } catch (error) {
    console.error('Error getting tasks by client:', error);
    throw error;
  }
};

// Buscar tarefas por clientId do colaborador cliente (para Cliente Externo)
export const getTasksByCollaboratorClientId = async (collaboratorId: string): Promise<Task[]> => {
  try {
    // Primeiro, buscar o cliente vinculado ao colaborador
    const clientsQuery = query(
      collection(db, 'clients'),
      where('collaboratorId', '==', collaboratorId)
    );
    const clientsSnapshot = await getDocs(clientsQuery);
    
    if (clientsSnapshot.empty) {
      return []; // Cliente não encontrado, retornar array vazio
    }
    
    const clientId = clientsSnapshot.docs[0].id;
    
    // Buscar tarefas do cliente
    return await getTasksByClient(clientId);
  } catch (error) {
    console.error('Error getting tasks by collaborator client ID:', error);
    throw error;
  }
};

export const getTasksByStatus = async (status: string): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where("status", "==", status)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return convertTimestamp({
          id: doc.id,
          ...data
        });
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  } catch (error) {
    console.error('Error getting tasks by status:', error);
    throw error;
  }
};

export const createTask = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
  try {
    // Prepare data for Firestore
    const taskData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Save to Firestore
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), taskData);
    
    // Create the task object to return
    const newTask: Task = {
      ...data,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Send WhatsApp notification asynchronously (don't block task creation)
    setTimeout(async () => {
      try {
        if (data.assignedTo && data.assignedTo !== data.createdBy) {
          console.log('📱 Enviando notificação WhatsApp para nova tarefa...');
          
          // Format due date
          const dueDateFormatted = data.dueDate 
            ? format(data.dueDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
            : 'Não definido';
          
          // Create notification data
          const notification = whatsappNotificationService.createTaskAssignmentNotification({
            id: docRef.id,
            assignedTo: data.assignedTo,
            title: data.title,
            description: data.description || 'Sem descrição',
            dueDate: dueDateFormatted,
            priority: data.priority,
            clientName: data.clientName || 'Não especificado'
          });
          
          // Send notification
          const result = await whatsappNotificationService.sendNotification(notification);
          
          if (result.success) {
            console.log('✅ Notificação WhatsApp enviada com sucesso');
          } else {
            console.warn('⚠️ Falha no envio da notificação WhatsApp:', result.error);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao enviar notificação WhatsApp:', error);
        // Não falha a criação da tarefa se a notificação falhar
      }
    }, 1000); // Delay de 1 segundo para não bloquear a criação
    
    // Return the full task data with ID
    return newTask;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

export const updateTask = async (id: string, data: Partial<Task>): Promise<boolean> => {
  try {
    const docRef = doc(db, TASKS_COLLECTION, id);
    
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (id: string): Promise<boolean> => {
  try {
    const docRef = doc(db, TASKS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const completeTask = async (id: string): Promise<boolean> => {
  try {
    const docRef = doc(db, TASKS_COLLECTION, id);
    
    await updateDoc(docRef, {
      status: TaskStatus.Concluída,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
};
