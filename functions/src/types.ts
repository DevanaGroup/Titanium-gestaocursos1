export enum TaskStatus {
  Pendente = "Pendente",
  EmAndamento = "Em andamento",
  Concluída = "Concluída",
  Bloqueada = "Bloqueada"
}

export enum TaskPriority {
  Baixa = "Baixa",
  Média = "Média",
  Alta = "Alta",
  Urgente = "Urgente"
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string;
  assignedToName: string;
  clientId?: string;
  clientName?: string;
  dueDate: any; // Firestore Timestamp
  completedAt?: any;
  createdAt: any;
  updatedAt: any;
  createdBy?: string;
  createdByName?: string;
  attachments?: string[];
  tags?: string[];
}

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  hierarchyLevel: string;
}

export interface NotificationEmail {
  to: string;
  message: {
    subject: string;
    html: string;
  };
}

export interface TaskNotificationData {
  taskId: string;
  taskTitle: string;
  priority: TaskPriority;
  dueDate: Date;
  assignedTo: string;
  assignedToName: string;
  assignedToEmail: string;
  clientName?: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

// Enums para Agenda
export enum AgendaEventType {
  Reuniao = "Reunião",
  Compromisso = "Compromisso",
  DespachoInterno = "Despacho Interno",
  Almoco = "Almoço",
  VisitaTecnica = "Visita Técnica",
  Deslocamento = "Deslocamento",
  Treinamento = "Treinamento",
  Apresentacao = "Apresentação",
  Audiencia = "Audiência",
  Feriado = "Feriado",
  PontoFacultativo = "Ponto Facultativo",
  Outros = "Outros"
}

export enum AgendaEventStatus {
  Agendado = "Agendado",
  Confirmado = "Confirmado",
  EmAndamento = "Em Andamento",
  Concluido = "Concluído",
  Cancelado = "Cancelado",
  Reagendado = "Reagendado"
}

// Interface para participantes de eventos
export interface AgendaParticipant {
  id: string;
  name: string;
  email: string;
  hierarchyLevel?: string;
  status: 'Convidado' | 'Confirmado' | 'Rejeitado' | 'Tentativo';
  role?: string;
  notificationPreference?: 'Email' | 'SMS' | 'Ambos' | 'Nenhum';
}

// Interface para eventos da agenda
export interface AgendaEvent {
  id: string;
  title: string;
  description?: string;
  type: AgendaEventType;
  status: AgendaEventStatus;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  ownerId: string;
  ownerName: string;
  participants?: AgendaParticipant[]; // Lista de participantes
  clientId?: string;
  clientName?: string;
  priority: TaskPriority;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName: string;
  // Configurações de notificação
  notifyAllCollaborators?: boolean;
  notifyByHierarchy?: string[];
  customParticipants?: string[]; // IDs de colaboradores específicos
}

// Interface para dados de notificação de agenda
export interface AgendaNotificationData {
  eventId: string;
  eventTitle: string;
  eventType: AgendaEventType;
  startDate: Date;
  endDate: Date;
  location?: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  // Participante específico sendo notificado
  participantId: string;
  participantName: string;
  participantEmail: string;
  participantRole?: string;
  clientName?: string;
  priority: TaskPriority;
  hoursUntilEvent: number;
  isToday: boolean;
  isTomorrow: boolean;
}

// ==================== NOTIFICAÇÕES FINANCEIRAS ====================

export interface FinancialDue {
  id: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  description: string;
  totalAmount: number;
  dueDate: Date;
  status: 'PENDENTE' | 'PAGO' | 'RECEBIDO' | 'VENCIDO' | 'CANCELADO';
  clientName?: string;
  supplierName?: string;
  createdBy: string;
  createdAt: Date;
  installments?: Array<{
    id: string;
    installmentNumber: number;
    amount: number;
    dueDate: Date;
    status: 'PENDENTE' | 'PAGO' | 'RECEBIDO' | 'VENCIDO' | 'CANCELADO';
  }>;
}

export interface FinancialNotificationData {
  dueId: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  description: string;
  amount: number;
  dueDate: Date;
  clientName?: string;
  responsibleUserId: string;
  responsibleUserName: string;
  responsibleUserEmail: string;
  priority: TaskPriority;
  daysUntilDue: number;
  isOverdue: boolean;
  installmentInfo?: {
    current: number;
    total: number;
  };
} 