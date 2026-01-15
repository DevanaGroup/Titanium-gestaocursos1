export type HierarchyLevel = 
  | "Nível 1"
  | "Nível 2"
  | "Nível 3"
  | "Nível 4"
  | "Nível 5"
  | "Nível 6";

export type ClientStatus = "Em andamento" | "Concluído" | "Em análise" | "Aguardando documentos";

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

export interface Collaborator {
  id: string;
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: Date;
  hierarchyLevel: HierarchyLevel;
  phone?: string;
  whatsapp?: string;
  address?: string;
  avatar?: string;
  responsibleName?: string;
  createdAt: Date;
  updatedAt: Date;
  source?: 'collaborators' | 'users'; // Indica de qual coleção veio o dado
  customPermissions?: CustomPermissions; // Permissões personalizadas
}

export interface Client {
  id: string;
  name: string;
  project: string;
  status: ClientStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  cpf?: string;
  cnpj?: string;
  createdAt: Date;
  updatedAt: Date;
  documents?: DocumentReference[];
  assignedTo?: string;
  assignedToName?: string;
  collaboratorId?: string; // ID do colaborador vinculado na coleção collaborators_unified
}

export interface DocumentReference {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: Date;
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
  dueDate: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  createdByName?: string;
  attachments?: string[];
  tags?: string[];
  archived?: boolean; // Indica se a tarefa está arquivada
  archivedAt?: Date; // Data em que a tarefa foi arquivada
}

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  photoURL?: string;
  hierarchyLevel: HierarchyLevel;
  phoneNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FinancialClient {
  id: string;
  originalClientId?: string; // Referência ao cliente na coleção "clients"
  name: string;
  monthlyValue: number;
  dueDate: number; // Dia do mês (1-31)
  contractStartDate: Date;
  contractEndDate?: Date;
  contractType: 'Recorrente' | 'Pontual';
  contractTerm?: '1 mês' | '3 meses' | '6 meses' | '1 ano' | '2 anos' | '5 anos'; // Prazo de contrato
  billingType: 'Mensal' | 'Anual' | 'Trimestral' | 'Semestral' | 'Único';
  status: 'Ativo' | 'Inativo' | 'Inadimplente' | 'Suspenso' | 'Sem dados financeiros';
  lastPaymentDate?: Date;
  assignedTo?: string;
  invoiceRequired: boolean; // Nota fiscal: Sim/Não
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
  // Dados do cliente original
  project?: string;
  clientStatus?: string;
  contactName?: string;
  cpf?: string;
  cnpj?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyBalance {
  id: string;
  month: number;
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  expenses: BalanceExpense[];
  clients: FinancialClient[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BalanceExpense {
  id: string;
  description: string;
  amount: number;
  category: 'Operacional' | 'Marketing' | 'Administrativo' | 'Tecnologia' | 'Recursos Humanos' | 'Outros';
  date: Date;
}

export interface ProspectClient {
  id: string;
  name: string;
  project: string;
  estimatedValue: number;
  probability: number; // 0-100%
  expectedCloseDate: Date;
  stage: 'Prospecção' | 'Proposta' | 'Negociação' | 'Fechamento' | 'Perdido' | 'Ganho';
  contactInfo: {
    contactName: string;
    email: string;
    phone: string;
    company: string;
    position: string;
  };
  notes: string;
  documents: string[]; // URLs dos documentos
  createdAt: Date;
  updatedAt: Date;
  assignedTo: string;
}

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
  // Proprietário do evento
  ownerId: string;
  ownerName: string;
  // Participantes
  participants?: AgendaParticipant[];
  // Vinculação com outras entidades
  clientId?: string;
  clientName?: string;
  taskId?: string;
  taskTitle?: string;
  // Configurações de lembrete
  reminders?: AgendaReminder[];
  // Recorrência
  recurrence?: AgendaRecurrence;
  // Metadados
  color?: string;
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

export interface AgendaParticipant {
  id: string;
  name: string;
  email: string;
  status: 'Convidado' | 'Confirmado' | 'Rejeitado' | 'Tentativo';
  role?: string;
}

export interface AgendaReminder {
  id: string;
  type: 'Email' | 'Notificacao' | 'SMS';
  minutesBefore: number;
  sent: boolean;
  sentAt?: Date;
}

export interface AgendaRecurrence {
  type: 'Diario' | 'Semanal' | 'Mensal' | 'Anual';
  interval: number; // Ex: a cada 2 semanas = interval: 2
  endDate?: Date;
  occurrences?: number;
  daysOfWeek?: number[]; // 0-6 (domingo a sábado)
  dayOfMonth?: number; // 1-31
  monthOfYear?: number; // 1-12
}

export interface AgendaFilter {
  startDate: Date;
  endDate: Date;
  ownerId?: string;
  types?: AgendaEventType[];
  status?: AgendaEventStatus[];
  clientId?: string;
  priority?: TaskPriority[];
}

export interface AgendaStats {
  totalEvents: number;
  eventsByType: Record<AgendaEventType, number>;
  eventsByStatus: Record<AgendaEventStatus, number>;
  upcomingEvents: number;
  overdueEvents: number;
}

// Sistema de Solicitação de Despesas
export interface ExpenseRequest {
  id: string;
  protocol: string; // Protocolo único para rastreamento
  requesterId: string;
  requesterName: string;
  title: string;
  description: string;
  amount: number;
  category: 'Operacional' | 'Marketing' | 'Administrativo' | 'Tecnologia' | 'Recursos Humanos' | 'Viagem' | 'Alimentação' | 'Material' | 'Combustível' | 'Hospedagem' | 'Transporte' | 'Outros';
  subcategory?: 'Combustível' | 'Pedágio' | 'Estacionamento' | 'Alimentação' | 'Hospedagem' | 'Passagem Aérea' | 'Passagem Terrestre' | 'Taxi/Uber' | 'Material de Escritório' | 'Software' | 'Hardware' | 'Treinamento' | 'Evento' | 'Outros';
  urgency: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  status: 'Em análise' | 'Aprovado' | 'Reprovado' | 'Cancelado';
  attachments: ExpenseAttachment[];
  justification: string;
  expectedDate: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Campos de aprovação
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewComments?: string;
  
  // Campos de pagamento
  paidAt?: Date;
  paidBy?: string;
  paidByName?: string;
  paymentMethod?: 'Dinheiro' | 'PIX' | 'Transferência' | 'Cartão Corporativo' | 'Reembolso';
  
  // Vinculação
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  
  // Campos específicos para viagens (quando categoria = 'Viagem')
  isTravel?: boolean;
  travelDetails?: {
    destination?: string;
    startDate?: Date;
    endDate?: Date;
    purpose?: string;
    kmBefore?: number;
    kmAfter?: number;
    kmTotal?: number;
    visitReportLink?: string;
    accommodationDetails?: string;
    transportDetails?: string;
  };
  
  // Recorrência para despesas fixas
  isRecurring?: boolean;
  recurringDetails?: {
    frequency: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
    endDate?: Date;
    occurrences?: number;
  };
}

export interface ExpenseAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface ExpenseRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
}

// Sistema de permissões customizáveis
export interface CustomPermissions {
  // Colaboradores
  canCreateCollaborators: boolean;
  canViewAllCollaborators: boolean;
  canEditAllCollaborators: boolean;
  canDeleteCollaborators: boolean;
  
  // Clientes
  canCreateClients: boolean;
  canViewAllClients: boolean;
  canEditAllClients: boolean;
  canDeleteClients: boolean;
  
  // Tarefas
  canViewAllTasks: boolean; // Nova permissão para visualizar todas as tarefas
  
  // Outras permissões
  canManagePermissions: boolean; // Pode alterar permissões de outros usuários
  canApproveExpenses: boolean;
  canViewFinancialReports: boolean;
}

// ============= PRODUTIVIDADE E TRACKING DE TEMPO =============

export interface TimeTracking {
  id: string;
  taskId: string;
  collaboratorId: string;
  startTime: Date;
  endTime?: Date;
  pausedTime: number; // tempo pausado em minutos
  activeTime: number; // tempo efetivo trabalhando em minutos
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskTimeEstimate {
  taskId: string;
  estimatedHours: number;
  actualHours?: number;
  complexity: 'Baixa' | 'Média' | 'Alta' | 'Muito Alta';
  estimatedBy: string;
  estimatedByName: string;
  createdAt: Date;
}

export interface ProductivityGoals {
  id: string;
  collaboratorId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  startDate: Date;
  endDate: Date;
  
  // Metas numéricas
  tasksGoal: number;
  hoursGoal: number;
  qualityScoreGoal: number; // 0-100
  
  // Progresso atual
  tasksCompleted: number;
  hoursWorked: number;
  currentQualityScore: number;
  
  // Status
  status: 'Em andamento' | 'Atingida' | 'Perdida' | 'Cancelada';
  
  // Metadados
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductivityMetrics {
  collaboratorId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  periodStart: Date;
  periodEnd: Date;
  
  // Métricas de tempo
  totalHoursWorked: number;
  averageHoursPerDay: number;
  overtimeHours: number;
  
  // Métricas de tarefas
  tasksCompleted: number;
  tasksCreated: number;
  tasksInProgress: number;
  averageTaskDuration: number; // em horas
  
  // Métricas de qualidade
  tasksCompletedOnTime: number;
  tasksCompletedLate: number;
  averageDelayDays: number;
  qualityScore: number; // 0-100
  
  // Métricas comparativas
  teamAverageProductivity: number;
  rankingPosition: number;
  improvementPercentage: number; // comparado ao período anterior
  
  // Padrões de trabalho
  mostProductiveHour: number; // 0-23
  mostProductiveDay: string; // 'monday', 'tuesday', etc.
  peakProductivityScore: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductivityReport {
  id: string;
  title: string;
  type: 'individual' | 'team' | 'departmental' | 'company';
  
  // Filtros aplicados
  collaboratorIds?: string[];
  departmentIds?: string[];
  period: {
    start: Date;
    end: Date;
    type: 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  
  // Dados do relatório
  summary: {
    totalCollaborators: number;
    totalHoursWorked: number;
    totalTasksCompleted: number;
    averageProductivity: number;
    topPerformers: {
      collaboratorId: string;
      collaboratorName: string;
      score: number;
    }[];
    bottomPerformers: {
      collaboratorId: string;
      collaboratorName: string;
      score: number;
    }[];
  };
  
  // Análises e insights
  insights: {
    trends: string[];
    recommendations: string[];
    alerts: string[];
  };
  
  // Dados detalhados por colaborador
  collaboratorMetrics: ProductivityMetrics[];
  
  // Metadados
  generatedBy: string;
  generatedByName: string;
  generatedAt: Date;
  scheduledGeneration?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    nextGeneration: Date;
  };
}

export interface ProductivityAlert {
  id: string;
  type: 'low_productivity' | 'missed_goal' | 'overtime' | 'quality_issue' | 'trend_decline';
  severity: 'info' | 'warning' | 'critical';
  
  collaboratorId: string;
  collaboratorName: string;
  
  title: string;
  description: string;
  
  // Dados específicos do alerta
  currentValue: number;
  expectedValue: number;
  threshold: number;
  
  // Status
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  
  // Ações sugeridas
  suggestedActions: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkPattern {
  collaboratorId: string;
  
  // Padrões temporais
  preferredWorkingHours: {
    start: string; // HH:MM
    end: string;   // HH:MM
  };
  
  // Dias mais produtivos
  productiveDays: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
  
  // Padrões de performance
  morningProductivity: number; // 0-100
  afternoonProductivity: number; // 0-100
  eveningProductivity: number; // 0-100
  
  // Características de trabalho
  averageTasksPerDay: number;
  preferredTaskComplexity: 'Baixa' | 'Média' | 'Alta' | 'Muito Alta';
  multitaskingScore: number; // 0-100
  focusTimeBlocks: number; // quantidade de blocos de tempo focado por dia
  
  // Histórico
  lastAnalyzed: Date;
  periodAnalyzed: {
    start: Date;
    end: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// Extensão da interface Task para incluir tracking de tempo
export interface TaskWithTimeTracking extends Task {
  estimatedHours?: number;
  actualHours?: number;
  complexity?: 'Baixa' | 'Média' | 'Alta' | 'Muito Alta';
  timeTracking?: TimeTracking[];
  isOverdue: boolean;
  delayDays?: number;
  productivityScore?: number; // 0-100
}

// Sistema de Trâmites de Tarefas
export enum ProcessStepStatus {
  EmAnalise = "Em análise",
  EmTransito = "Em trânsito",
  Assinado = "Assinado",
  Rejeitado = "Rejeitado"
}

export interface ProcessStep {
  id: string;
  taskId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: ProcessStepStatus;
  notes?: string;
  richNotes?: string;        // HTML do editor rico
  attachments?: ProcessAttachment[];  // Anexos do trâmite
  
  // Timestamps
  createdAt: Date;          // Quando foi enviado
  transitedAt?: Date;       // Quando foi movido
  signedAt?: Date;          // Quando foi assinado/aceito
  rejectedAt?: Date;        // Quando foi rejeitado
  
  // Duração em análise
  timeInAnalysis?: number;  // Minutos que ficou em análise
  timeInTransit?: number;   // Minutos que ficou em trânsito
  
  // Campos de controle
  requiresSignature: boolean;
  isActive: boolean;        // Se é o trâmite atual
}

export interface ProcessAttachment {
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

export interface TaskProcess {
  id: string;
  taskId: string;
  steps: ProcessStep[];
  currentStepId?: string;   // ID do step atual
  isCompleted: boolean;
  
  // Estatísticas
  totalSteps: number;
  totalTimeInProcess: number; // Minutos totais no processo
  averageStepTime: number;    // Tempo médio por step
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessTransition {
  stepId: string;
  action: 'forward' | 'sign' | 'reject' | 'request_changes';
  fromUserId: string;
  fromUserName: string;
  toUserId?: string;        // Para action 'forward'
  toUserName?: string;
  notes?: string;
  timestamp: Date;
}

export interface ProcessNotification {
  id: string;
  taskId: string;
  stepId: string;
  recipientId: string;
  recipientEmail: string;
  type: 'task_received' | 'task_signed' | 'task_rejected' | 'task_overdue';
  subject: string;
  message: string;
  sent: boolean;
  sentAt?: Date;
  createdAt: Date;
}

export interface ProcessMetrics {
  taskId: string;
  totalProcessTime: number;     // Tempo total do processo em minutos
  averageStepTime: number;      // Tempo médio por step
  bottlenecks: {               // Gargalos identificados
    userId: string;
    userName: string;
    averageTime: number;
    stepCount: number;
  }[];
  fastestUser: {
    userId: string;
    userName: string;
    averageTime: number;
  };
  slowestUser: {
    userId: string;
    userName: string;
    averageTime: number;
  };
}

export interface Prospect {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  source: 'Site' | 'Indicação' | 'Telemarketing' | 'Evento' | 'Rede Social' | 'Outro';
  status: 'Cold' | 'Warm' | 'Hot' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed-Won' | 'Closed-Lost';
  score: number; // 0-100
  notes?: string;
  assignedTo: string; // ID do colaborador comercial
  assignedToName: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactDate?: Date;
  nextContactDate?: Date;
  expectedValue?: number;
  closingProbability?: number; // 0-100
  tags?: string[];
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface ProspectActivity {
  id: string;
  prospectId: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Note' | 'Proposal' | 'Task';
  title: string;
  description: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  scheduledFor?: Date;
  completed: boolean;
  outcome?: 'Positive' | 'Negative' | 'Neutral';
}

export interface CommercialTarget {
  id: string;
  collaboratorId: string;
  collaboratorName: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  year: number;
  month?: number;
  quarter?: number;
  targetValue: number;
  targetLeads: number;
  targetConversions: number;
  currentValue: number;
  currentLeads: number;
  currentConversions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommercialReport {
  id: string;
  collaboratorId: string;
  collaboratorName: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalProspects: number;
    qualifiedLeads: number;
    conversions: number;
    totalValue: number;
    conversionRate: number;
    averageTicket: number;
    sourceBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
  };
  generatedAt: Date;
}

// Exportar tipos financeiros expandidos
export * from './financial';
