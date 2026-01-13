import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  AgendaEvent, 
  AgendaEventType, 
  AgendaEventStatus, 
  AgendaFilter, 
  AgendaStats,
  TaskPriority 
} from '@/types';

const COLLECTION_NAME = 'agendaEvents';

// Converter Firestore data para AgendaEvent
const convertFirestoreToAgendaEvent = (doc: any): AgendaEvent => {
  const data = doc.data();
  
  return {
    id: doc.id,
    title: data.title,
    description: data.description,
    type: data.type,
    status: data.status,
    startDate: data.startDate?.toDate() || new Date(),
    endDate: data.endDate?.toDate() || new Date(),
    allDay: data.allDay || false,
    location: data.location,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    participants: data.participants || [],
    clientId: data.clientId,
    clientName: data.clientName,
    taskId: data.taskId,
    taskTitle: data.taskTitle,
    reminders: data.reminders || [],
    recurrence: data.recurrence,
    color: data.color,
    priority: data.priority || TaskPriority.Média,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    createdByName: data.createdByName,
  };
};

// Converter AgendaEvent para Firestore data
const convertAgendaEventToFirestore = (event: Partial<AgendaEvent>) => {
  const data: any = { ...event };
  
  if (data.startDate) {
    data.startDate = Timestamp.fromDate(data.startDate);
  }
  if (data.endDate) {
    data.endDate = Timestamp.fromDate(data.endDate);
  }
  if (data.createdAt) {
    data.createdAt = Timestamp.fromDate(data.createdAt);
  }
  if (data.updatedAt) {
    data.updatedAt = Timestamp.fromDate(data.updatedAt);
  }
  
  delete data.id;
  return data;
};

// Criar novo evento
export const createAgendaEvent = async (eventData: Omit<AgendaEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    const newEvent = {
      ...eventData,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(
      collection(db, COLLECTION_NAME),
      convertAgendaEventToFirestore(newEvent)
    );
    
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar evento na agenda:', error);
    throw error;
  }
};

// Buscar eventos por filtro - VERSÃO SIMPLIFICADA SEM ÍNDICES COMPOSTOS
export const getAgendaEvents = async (filter: AgendaFilter): Promise<AgendaEvent[]> => {
  try {
    // Fazer uma consulta simples por proprietário apenas
    let q = query(collection(db, COLLECTION_NAME));
    
    // Filtro por proprietário (query simples)
    if (filter.ownerId) {
      q = query(q, where('ownerId', '==', filter.ownerId));
    }
    
    const snapshot = await getDocs(q);
    let events = snapshot.docs.map(convertFirestoreToAgendaEvent);
    
    // Aplicar filtros de data no lado do cliente
    events = events.filter(event => {
      const eventDate = event.startDate;
      return eventDate >= filter.startDate && eventDate <= filter.endDate;
    });
    
    // Filtros adicionais (aplicados no cliente)
    if (filter.types && filter.types.length > 0) {
      events = events.filter(event => filter.types!.includes(event.type));
    }
    
    if (filter.status && filter.status.length > 0) {
      events = events.filter(event => filter.status!.includes(event.status));
    }
    
    if (filter.clientId) {
      events = events.filter(event => event.clientId === filter.clientId);
    }
    
    if (filter.priority && filter.priority.length > 0) {
      events = events.filter(event => filter.priority!.includes(event.priority));
    }
    
    // Ordenar por data (no cliente)
    events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    return events;
  } catch (error) {
    console.error('Erro ao buscar eventos da agenda:', error);
    throw error;
  }
};

// Buscar eventos do usuário para um mês específico
export const getUserAgendaForMonth = async (userId: string, year: number, month: number): Promise<AgendaEvent[]> => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return getAgendaEvents({
    startDate,
    endDate,
    ownerId: userId,
  });
};

// Buscar eventos próximos do usuário
export const getUpcomingUserEvents = async (userId: string, days: number = 7): Promise<AgendaEvent[]> => {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  const events = await getAgendaEvents({
    startDate,
    endDate,
    ownerId: userId,
  });
  
  // Filtrar apenas eventos agendados/confirmados
  return events.filter(event => 
    event.status === AgendaEventStatus.Agendado || 
    event.status === AgendaEventStatus.Confirmado
  );
};

// Atualizar evento
export const updateAgendaEvent = async (eventId: string, updates: Partial<AgendaEvent>): Promise<void> => {
  try {
    const eventRef = doc(db, COLLECTION_NAME, eventId);
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };
    
    await updateDoc(eventRef, convertAgendaEventToFirestore(updateData));
  } catch (error) {
    console.error('Erro ao atualizar evento da agenda:', error);
    throw error;
  }
};

// Excluir evento
export const deleteAgendaEvent = async (eventId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, eventId));
  } catch (error) {
    console.error('Erro ao excluir evento da agenda:', error);
    throw error;
  }
};

// Marcar evento como concluído
export const completeAgendaEvent = async (eventId: string): Promise<void> => {
  return updateAgendaEvent(eventId, {
    status: AgendaEventStatus.Concluido,
    updatedAt: new Date(),
  });
};

// Cancelar evento
export const cancelAgendaEvent = async (eventId: string, reason?: string): Promise<void> => {
  return updateAgendaEvent(eventId, {
    status: AgendaEventStatus.Cancelado,
    description: reason ? `${reason}` : undefined,
    updatedAt: new Date(),
  });
};

// Obter estatísticas da agenda do usuário - VERSÃO SIMPLIFICADA
export const getUserAgendaStats = async (userId: string): Promise<AgendaStats> => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    const events = await getAgendaEvents({
      startDate: startOfMonth,
      endDate: endOfMonth,
      ownerId: userId,
    });
    
    const stats: AgendaStats = {
      totalEvents: events.length,
      eventsByType: {} as Record<AgendaEventType, number>,
      eventsByStatus: {} as Record<AgendaEventStatus, number>,
      upcomingEvents: 0,
      overdueEvents: 0,
    };
    
    // Inicializar contadores
    Object.values(AgendaEventType).forEach(type => {
      stats.eventsByType[type] = 0;
    });
    
    Object.values(AgendaEventStatus).forEach(status => {
      stats.eventsByStatus[status] = 0;
    });
    
    const now = new Date();
    
    events.forEach(event => {
      // Contar por tipo
      stats.eventsByType[event.type]++;
      
      // Contar por status
      stats.eventsByStatus[event.status]++;
      
      // Contar próximos
      if (event.startDate > now && 
          (event.status === AgendaEventStatus.Agendado || event.status === AgendaEventStatus.Confirmado)) {
        stats.upcomingEvents++;
      }
      
      // Contar atrasados
      if (event.startDate < now && 
          (event.status === AgendaEventStatus.Agendado || event.status === AgendaEventStatus.Confirmado)) {
        stats.overdueEvents++;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Erro ao obter estatísticas da agenda:', error);
    throw error;
  }
};

// Criar evento baseado em uma tarefa
export const createEventFromTask = async (
  task: any, 
  userId: string, 
  userName: string, 
  eventDate: Date,
  duration: number = 60 // minutos
): Promise<string> => {
  const startDate = eventDate;
  const endDate = new Date(eventDate.getTime() + duration * 60 * 1000);
  
  const eventData: Omit<AgendaEvent, 'id' | 'createdAt' | 'updatedAt'> = {
    title: task.title,
    description: task.description,
    type: AgendaEventType.Reuniao,
    status: AgendaEventStatus.Agendado,
    startDate,
    endDate,
    allDay: false,
    ownerId: userId,
    ownerName: userName,
    clientId: task.clientId,
    clientName: task.clientName,
    taskId: task.id,
    taskTitle: task.title,
    priority: task.priority,
    createdBy: userId,
    createdByName: userName,
  };
  
  return createAgendaEvent(eventData);
}; 