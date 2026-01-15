import { HierarchyLevel, CustomPermissions, Collaborator } from '@/types';

// Hierarquia ordenada do mais alto para o mais baixo nível
export const HIERARCHY_LEVELS: HierarchyLevel[] = [
  "Nível 1",
  "Nível 2",
  "Nível 3",
  "Nível 4",
  "Nível 5",
  "Nível 6"
];

// Extrair número do nível (ex: "Nível 1" -> 1)
export const getLevelNumber = (level: HierarchyLevel): number => {
  const match = level.match(/\d+/);
  return match ? parseInt(match[0], 10) : 5; // Default para nível mais baixo se não encontrar
};

// Mapear níveis para números para facilitar comparações
export const getHierarchyLevel = (level: HierarchyLevel): number => {
  return getLevelNumber(level);
};

// Verificar se um usuário tem permissão sobre outro baseado na hierarquia
export const hasHierarchicalPermission = (userLevel: HierarchyLevel, targetLevel: HierarchyLevel): boolean => {
  const userLevelNum = getLevelNumber(userLevel);
  const targetLevelNum = getLevelNumber(targetLevel);
  
  // Níveis menores = maior autoridade (Nível 1 > Nível 2 > ... > Nível 5)
  return userLevelNum < targetLevelNum;
};

// Verificar se um usuário pode criar/gerenciar outro nível
export const canManageLevel = (userLevel: HierarchyLevel, targetLevel: HierarchyLevel): boolean => {
  // Ninguém pode gerenciar usuários do mesmo nível
  if (userLevel === targetLevel) {
    return false;
  }
  
  // Nível 1 não pode criar outros Nível 1
  if (userLevel === "Nível 1" && targetLevel === "Nível 1") {
    return false;
  }
  
  // Níveis superiores podem gerenciar níveis inferiores
  return hasHierarchicalPermission(userLevel, targetLevel);
};

// Sistema de permissões - verificar se tem permissão específica baseado apenas no número
export const hasPermission = (userLevel: HierarchyLevel, permission: string): boolean => {
  const levelNum = getLevelNumber(userLevel);
  
  // Permissões baseadas apenas no número do nível
  // Nível 1 tem todas as permissões
  // Nível 2 tem permissões altas
  // Nível 3 tem permissões intermediárias
  // Nível 4 tem permissões básicas
  // Nível 5 tem permissões mínimas
  
  switch (permission) {
    case 'manage_department':
    case 'manage_all_users':
      return levelNum <= 3; // Níveis 1, 2, 3 podem gerenciar
    
    case 'approve_expenses':
      return levelNum <= 2; // Apenas Níveis 1 e 2 podem aprovar despesas
      
    case 'view_financial_reports':
      return levelNum <= 3; // Níveis 1, 2, 3 podem ver relatórios financeiros
      
    case 'view_all_tasks':
      return levelNum <= 3; // Níveis 1, 2, 3 podem ver todas as tarefas
      
    case 'chatbot_access':
      return levelNum <= 2; // Apenas Níveis 1 e 2 têm acesso ao chatbot
      
    case 'suporte_web':
      return true; // Todos têm acesso ao suporte
      
    case 'settings_access':
      return levelNum === 1; // Apenas Nível 1 tem acesso às configurações
      
    case 'technical_checklist_access':
      return levelNum <= 4; // Níveis 1-4 têm acesso ao checklist técnico
      
    case 'view_own_data':
    case 'create_expense_requests':
      return true; // Todos podem ver seus próprios dados e criar solicitações
      
    default:
      return levelNum <= 3; // Por padrão, níveis 1-3 têm permissão
  }
};

// Obter níveis que um usuário pode gerenciar
export const getManagedLevels = (userLevel: HierarchyLevel): HierarchyLevel[] => {
  const levelNum = getLevelNumber(userLevel);
  
  // Nível 1 não pode criar outros Nível 1
  if (levelNum === 1) {
    return HIERARCHY_LEVELS.filter(level => level !== "Nível 1");
  }
  
  // Outros níveis podem gerenciar níveis inferiores
  return HIERARCHY_LEVELS.filter(level => hasHierarchicalPermission(userLevel, level));
};

// Obter descrição do nível hierárquico
export const getHierarchyDescription = (level: HierarchyLevel): string => {
  const levelNum = getLevelNumber(level);
  
  const descriptions: Record<number, string> = {
    1: "🔝 Máximo de permissões - Acesso total ao sistema",
    2: "📊 Alto nível de permissões - Gestão e aprovações",
    3: "⚙️ Permissões intermediárias - Visualização e operações",
    4: "📝 Permissões básicas - Operações limitadas",
    5: "👤 Permissões mínimas - Acesso restrito",
    6: "👨‍🏫 Professor - Acesso para gerenciar cursos e aulas"
  };
  
  return descriptions[levelNum] || level;
};

// Obter cor do nível para UI
export const getHierarchyColor = (level: HierarchyLevel): string => {
  const levelNum = getLevelNumber(level);
  
  const colors: Record<number, string> = {
    1: "bg-purple-500 text-white",
    2: "bg-blue-500 text-white",
    3: "bg-green-500 text-white",
    4: "bg-yellow-500 text-black",
    5: "bg-gray-400 text-white",
    6: "bg-indigo-500 text-white"
  };
  
  return colors[levelNum] || "bg-gray-400 text-white";
};

// Verificar se usuário pode gerenciar permissões de outros
export const canManagePermissions = (userLevel: HierarchyLevel): boolean => {
  const levelNum = getLevelNumber(userLevel);
  return levelNum <= 2; // Apenas Níveis 1 e 2 podem gerenciar permissões
};

// Obter permissões padrão para um nível hierárquico
export const getDefaultPermissions = (level: HierarchyLevel): CustomPermissions => {
  const levelNum = getLevelNumber(level);
  
  // Permissões baseadas apenas no número do nível
  const canManage = levelNum <= 3; // Níveis 1-3 podem gerenciar
  const canApproveExpenses = levelNum <= 2; // Apenas Níveis 1-2 podem aprovar despesas
  const canViewFinancial = levelNum <= 3; // Níveis 1-3 podem ver financeiro
  const canViewAllTasks = levelNum <= 3; // Níveis 1-3 podem ver todas as tarefas
  
  return {
    canCreateCollaborators: canManage,
    canViewAllCollaborators: true, // Todos podem ver colaboradores
    canEditAllCollaborators: canManage,
    canDeleteCollaborators: canManage,
    
    canCreateClients: canManage,
    canViewAllClients: canManage,
    canEditAllClients: true, // Todos podem editar clientes
    canDeleteClients: canManage,
    
    canViewAllTasks: canViewAllTasks,
    
    canManagePermissions: levelNum <= 2, // Apenas Níveis 1-2 podem gerenciar permissões
    canApproveExpenses: canApproveExpenses,
    canViewFinancialReports: canViewFinancial
  };
};

// Verificar permissão específica considerando permissões customizadas
export const hasCustomPermission = (
  collaborator: Collaborator, 
  permission: keyof CustomPermissions
): boolean => {
  // Se tem permissões customizadas, usar elas
  if (collaborator.customPermissions) {
    return collaborator.customPermissions[permission];
  }
  
  // Senão, usar permissões padrão baseadas no nível hierárquico
  const defaultPermissions = getDefaultPermissions(collaborator.hierarchyLevel);
  return defaultPermissions[permission];
};

// Verificar se usuário tem acesso ao ChatBot
export const hasChatbotAccess = (userLevel: HierarchyLevel): boolean => {
  const levelNum = getLevelNumber(userLevel);
  return levelNum <= 2; // Apenas Níveis 1 e 2
};

// Verificar se usuário tem acesso a Relatórios e Financeiro
export const hasFinancialAccess = (userLevel: HierarchyLevel): boolean => {
  const levelNum = getLevelNumber(userLevel);
  return levelNum <= 3; // Níveis 1-3
};

// Verificar se usuário tem acesso às Configurações
export const hasSettingsAccess = (userLevel: HierarchyLevel): boolean => {
  const levelNum = getLevelNumber(userLevel);
  return levelNum === 1; // Apenas Nível 1
};

// Verificar se usuário pode visualizar um cliente específico
export const canViewClient = (userLevel: HierarchyLevel, clientId: string, userClientId?: string): boolean => {
  // Todos os níveis podem ver todos os clientes (se tiverem permissão)
  // A restrição específica será feita via hasPermission('view_all_clients')
  return true;
};

// Verificar se usuário pode visualizar uma tarefa específica
export const canViewTask = (userLevel: HierarchyLevel, taskClientId?: string, userClientId?: string): boolean => {
  // Todos os níveis podem ver tarefas (se tiverem permissão)
  // A restrição específica será feita via hasPermission('view_all_tasks')
  return true;
};

// Função helper para normalizar qualquer string para HierarchyLevel
// Se for um nível numérico válido, retorna ele. Caso contrário, retorna "Nível 5" como padrão
export const normalizeHierarchyLevel = (level: string | HierarchyLevel | null | undefined): HierarchyLevel => {
  if (!level) return "Nível 5";
  
  // Se já é um HierarchyLevel válido, retorna
  if (level === "Nível 1" || level === "Nível 2" || level === "Nível 3" || level === "Nível 4" || level === "Nível 5" || level === "Nível 6") {
    return level;
  }
  
  // Mapear nomes de cargos para níveis (baseado em lógica de negócio)
  // Presidente, Diretores -> Nível 1
  if (level === "Presidente" || level === "Diretor" || level === "Diretor de TI" || 
      level === "Diretor Financeiro" || level === "Diretor Comercial") {
    return "Nível 1";
  }
  
  // Gerente -> Nível 2
  if (level === "Gerente") {
    return "Nível 2";
  }
  
  // Coordenador, Supervisor -> Nível 3
  if (level === "Coordenador" || level === "Supervisor") {
    return "Nível 3";
  }
  
  // Líder Técnico, Engenheiro, Analista, Financeiro -> Nível 3
  if (level === "Líder Técnico" || level === "Engenheiro" || level === "Analista" || level === "Financeiro") {
    return "Nível 3";
  }
  
  // Técnico/Assistente, Comercial -> Nível 4
  if (level === "Técnico/Assistente" || level === "Comercial") {
    return "Nível 4";
  }
  
  // Estagiário/Auxiliar -> Nível 5
  if (level === "Estagiário/Auxiliar") {
    return "Nível 5";
  }
  
  // Cliente Externo, Cliente -> Nível 5 (acesso limitado)
  if (level === "Cliente Externo" || level === "Cliente") {
    return "Nível 5";
  }
  
  // Padrão: Nível 5
  return "Nível 5";
};

// Funções helper para verificar cargos específicos (compatibilidade com código existente)
export const isPresidente = (level: HierarchyLevel | string | null | undefined): boolean => {
  const normalized = normalizeHierarchyLevel(level);
  return normalized === "Nível 1";
};

export const isDiretorTI = (level: HierarchyLevel | string | null | undefined): boolean => {
  const normalized = normalizeHierarchyLevel(level);
  return normalized === "Nível 1";
};

export const isClienteExterno = (level: HierarchyLevel | string | null | undefined): boolean => {
  if (!level) return false;
  return level === "Cliente Externo" || level === "Cliente";
};
