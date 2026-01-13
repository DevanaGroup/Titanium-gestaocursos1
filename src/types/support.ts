// Tipos específicos para o sistema de suporte técnico web

// ==================== TICKET DE SUPORTE ====================
export interface SupportTicket {
  id: string;
  protocol: string; // SUP{YY}{MM}{DD}{timestamp}
  title: string;
  description: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  
  // Dados do solicitante
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterHierarchy: string;
  requesterDepartment?: string;
  
  // Dados de atribuição
  assignedTo?: string; // ID do Diretor de TI
  assignedToName?: string;
  assignedAt?: Date;
  
  // Anexos e evidências
  attachments: TicketAttachment[];
  screenshots?: string[]; // URLs das capturas de tela
  
  // Informações técnicas
  browserInfo?: BrowserInfo;
  deviceInfo?: DeviceInfo;
  pageUrl?: string; // URL onde ocorreu o problema
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  
  // Resolução
  resolution?: string;
  resolutionType?: ResolutionType;
  resolutionSteps?: string[]; // Passos da solução
  
  // Métricas
  timeToResolve?: number; // em horas
  timeToFirstResponse?: number; // em minutos
  
  // Avaliação (opcional)
  satisfaction?: SatisfactionRating;
  feedback?: string;
  
  // Comunicação
  updates: TicketUpdate[];
  isUrgent?: boolean; // Para notificações especiais
}

// ==================== CATEGORIAS ====================
export type SupportCategory = 
  | 'Acesso/Login'        // Problemas de autenticação, senhas, permissões
  | 'Funcionalidade'      // Recursos não funcionam como esperado
  | 'Bug/Erro'           // Erros no sistema, comportamentos inesperados
  | 'Performance'        // Lentidão, travamentos, carregamento
  | 'Relatórios'         // Problemas com geração, visualização de dados
  | 'Navegação'          // Problemas de menu, links, redirecionamentos
  | 'Dados'              // Problemas com salvamento, perda de dados
  | 'Integração'         // Problemas com WhatsApp, email, etc.
  | 'Mobile'             // Problemas específicos em dispositivos móveis
  | 'Outros';            // Dúvidas gerais, sugestões

// ==================== PRIORIDADES ====================
export type SupportPriority = 
  | 'Baixa'    // Melhorias, dúvidas, sugestões
  | 'Média'    // Funcionalidade secundária com problema
  | 'Alta'     // Funcionalidade crítica não funciona
  | 'Urgente'; // Sistema indisponível, perda de dados

// ==================== STATUS ====================
export type SupportStatus = 
  | 'Aberto'              // Recém criado, aguardando análise
  | 'Em Análise'          // Sendo analisado pelo TI
  | 'Aguardando Usuário'  // Aguardando informações do usuário
  | 'Em Desenvolvimento'  // Correção sendo implementada
  | 'Em Teste'           // Correção implementada, em teste
  | 'Resolvido'          // Problema resolvido
  | 'Fechado'            // Ticket finalizado
  | 'Cancelado'          // Cancelado pelo usuário
  | 'Excluído';          // Ticket excluído (soft delete)

// ==================== TIPOS DE RESOLUÇÃO ====================
export type ResolutionType = 
  | 'Corrigido'          // Bug foi corrigido
  | 'Orientação'         // Fornecida orientação de uso
  | 'Não é Bug'          // Comportamento esperado
  | 'Duplicado'          // Já existe outro ticket
  | 'Não Reproduzível'   // Não foi possível reproduzir
  | 'Melhoria'           // Implementada melhoria
  | 'Configuração';      // Problema de configuração

// ==================== ANEXOS ====================
export interface TicketAttachment {
  id: string;
  name: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: Date;
  uploadedBy: string;
  uploadedByName: string;
}

// ==================== INFORMAÇÕES TÉCNICAS ====================
export interface BrowserInfo {
  browser: string;
  version: string;
  userAgent: string;
}

export interface DeviceInfo {
  os: string;
  device: string;
  screenResolution: string;
  viewport: string;
}

// ==================== UPDATES/COMUNICAÇÃO ====================
export interface TicketUpdate {
  id: string;
  ticketId: string;
  type: UpdateType;
  message: string;
  authorId: string;
  authorName: string;
  authorRole: 'requester' | 'support' | 'system';
  attachments?: TicketAttachment[];
  isInternal?: boolean; // Comentário interno, não visível ao usuário
  createdAt: Date;
  
  // Para mudanças de status
  statusChange?: {
    from: SupportStatus;
    to: SupportStatus;
  };
  
  // Para atribuições
  assignmentChange?: {
    from?: string;
    to: string;
    fromName?: string;
    toName: string;
  };
}

export type UpdateType = 
  | 'comment'           // Comentário geral
  | 'status_change'     // Mudança de status
  | 'assignment'        // Atribuição/reatribuição
  | 'resolution'        // Resolução do ticket
  | 'system'           // Atualização automática do sistema
  | 'additional_info'; // Informações adicionais

// ==================== AVALIAÇÃO ====================
export type SatisfactionRating = 1 | 2 | 3 | 4 | 5;

// ==================== MÉTRICAS E RELATÓRIOS ====================
export interface SupportMetrics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number; // em horas
  averageFirstResponseTime: number; // em minutos
  
  // Por prioridade
  ticketsByPriority: Record<SupportPriority, number>;
  
  // Por categoria
  ticketsByCategory: Record<SupportCategory, number>;
  
  // Por status
  ticketsByStatus: Record<SupportStatus, number>;
  
  // Satisfação
  averageSatisfaction?: number;
  satisfactionCount?: Record<SatisfactionRating, number>;
  
  // Período
  period: {
    start: Date;
    end: Date;
  };
}

// ==================== FILTROS ====================
export interface SupportTicketFilter {
  status?: SupportStatus[];
  category?: SupportCategory[];
  priority?: SupportPriority[];
  assignedTo?: string;
  requesterId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
  resolutionType?: ResolutionType[];
}

// ==================== CONFIGURAÇÕES ====================
export interface SupportConfig {
  // Tempos limites (em horas)
  slaByPriority: Record<SupportPriority, number>;
  
  // Notificações
  notifications: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    urgentThreshold: number; // horas para considerar urgente
  };
  
  // Auto-assignment
  autoAssignToITDirector: boolean;
  itDirectorId?: string;
  
  // Categorias ativas
  activeCategories: SupportCategory[];
  
  // Templates de resposta
  responseTemplates: ResponseTemplate[];
}

export interface ResponseTemplate {
  id: string;
  name: string;
  category: SupportCategory;
  template: string;
  isActive: boolean;
}

// ==================== UTILITÁRIOS ====================
export interface TicketCreationData {
  title: string;
  description: string;
  category: SupportCategory;
  priority: SupportPriority;
  pageUrl?: string;
  attachments?: File[];
  screenshots?: File[];
}

export interface TicketUpdateData {
  message?: string;
  status?: SupportStatus;
  priority?: SupportPriority;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: Date;
  resolution?: string;
  resolutionType?: ResolutionType;
  attachments?: File[];
  isInternal?: boolean;
  resolvedAt?: Date;
  closedAt?: Date;
}

// ==================== CONSTANTES ====================
export const SUPPORT_CATEGORIES: { value: SupportCategory; label: string; icon: string; description: string }[] = [
  {
    value: 'Acesso/Login',
    label: 'Acesso/Login',
    icon: '🔐',
    description: 'Problemas de autenticação, senhas, permissões'
  },
  {
    value: 'Funcionalidade',
    label: 'Funcionalidade',
    icon: '⚙️',
    description: 'Recursos não funcionam como esperado'
  },
  {
    value: 'Bug/Erro',
    label: 'Bug/Erro',
    icon: '🐛',
    description: 'Erros no sistema, comportamentos inesperados'
  },
  {
    value: 'Performance',
    label: 'Performance',
    icon: '🚀',
    description: 'Lentidão, travamentos, carregamento'
  },
  {
    value: 'Relatórios',
    label: 'Relatórios',
    icon: '📊',
    description: 'Problemas com geração, visualização de dados'
  },
  {
    value: 'Navegação',
    label: 'Navegação',
    icon: '🧭',
    description: 'Problemas de menu, links, redirecionamentos'
  },
  {
    value: 'Dados',
    label: 'Dados',
    icon: '💾',
    description: 'Problemas com salvamento, perda de dados'
  },
  {
    value: 'Integração',
    label: 'Integração',
    icon: '🔗',
    description: 'Problemas com WhatsApp, email, etc.'
  },
  {
    value: 'Mobile',
    label: 'Mobile',
    icon: '📱',
    description: 'Problemas específicos em dispositivos móveis'
  },
  {
    value: 'Outros',
    label: 'Outros',
    icon: '❓',
    description: 'Dúvidas gerais, sugestões'
  }
];

export const SUPPORT_PRIORITIES: { value: SupportPriority; label: string; color: string; icon: string }[] = [
  {
    value: 'Baixa',
    label: 'Baixa',
    color: 'bg-blue-100 text-blue-800',
    icon: '📌'
  },
  {
    value: 'Média',
    label: 'Média',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '📋'
  },
  {
    value: 'Alta',
    label: 'Alta',
    color: 'bg-orange-100 text-orange-800',
    icon: '⚠️'
  },
  {
    value: 'Urgente',
    label: 'Urgente',
    color: 'bg-red-100 text-red-800',
    icon: '🚨'
  }
];

export const SUPPORT_STATUSES: { value: SupportStatus; label: string; color: string; icon: string }[] = [
  {
    value: 'Aberto',
    label: 'Aberto',
    color: 'bg-blue-100 text-blue-800',
    icon: '🆕'
  },
  {
    value: 'Em Análise',
    label: 'Em Análise',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '🔍'
  },
  {
    value: 'Aguardando Usuário',
    label: 'Aguardando Usuário',
    color: 'bg-purple-100 text-purple-800',
    icon: '⏳'
  },
  {
    value: 'Em Desenvolvimento',
    label: 'Em Desenvolvimento',
    color: 'bg-indigo-100 text-indigo-800',
    icon: '⚡'
  },
  {
    value: 'Em Teste',
    label: 'Em Teste',
    color: 'bg-cyan-100 text-cyan-800',
    icon: '🧪'
  },
  {
    value: 'Resolvido',
    label: 'Resolvido',
    color: 'bg-green-100 text-green-800',
    icon: '✅'
  },
  {
    value: 'Fechado',
    label: 'Fechado',
    color: 'bg-gray-100 text-gray-800',
    icon: '🔒'
  },
  {
    value: 'Cancelado',
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    icon: '❌'
  },
  {
    value: 'Excluído',
    label: 'Excluído',
    color: 'bg-gray-100 text-gray-500',
    icon: '🗑️'
  }
];

// Array simples dos status para uso em dropdowns
export const SUPPORT_STATUS: SupportStatus[] = [
  'Aberto',
  'Em Análise', 
  'Aguardando Usuário',
  'Em Desenvolvimento',
  'Em Teste',
  'Resolvido',
  'Fechado',
  'Cancelado',
  'Excluído'
]; 