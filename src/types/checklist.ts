// Tipos para sistema de Checklist

// ==================== PRESETS ====================
export interface PresetArea {
  id: string;
  name: string;
  items: PresetItem[];
  order: number;
  isExpanded?: boolean;
}

export interface PresetItem {
  id: string;
  title: string;
  description: string;
  order: number;
  isExpanded?: boolean;
}

export interface Preset {
  id: string;
  nome: string;
  descricao: string;
  areas: PresetArea[];
  createdAt: Date;
  updatedAt: Date;
}

// ==================== PROJETOS ====================
export type ResponseOption = 'na' | 'very_bad' | 'good';

export const RESPONSE_VALUES: Record<ResponseOption, number> = {
  na: 0,
  very_bad: 0,
  good: 7.5,
};

export interface MediaAttachment {
  id: string;
  url: string;
  type: 'photo' | 'video' | 'document';
  createdAt: string;
  uploadedBy?: string;
  latitude?: number;
  longitude?: number;
  location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

export interface WeightedQuestion {
  id: string;
  text: string;
  weight: number;
  required: boolean;
  responseOptions: ResponseOption[];
  response: {
    selectedOption: ResponseOption;
    score: number;
    timestamp?: string;
    answeredBy?: string;
    answeredByName?: string;
    respondedAt?: string;
    respondedBy?: string;
    mediaAttachments?: MediaAttachment[];
    comments?: any[];
    currentSituation?: string;
    aiGuidance?: string;
    userComment?: string;
    userCommentBy?: string;
    userCommentDate?: string;
  } | null;
  order: number;
}

export interface NC {
  id: string;
  numero: number;
  ncTitulo: string;
  descricao?: string;
  local?: string;
  perguntas: WeightedQuestion[];
  pontuacaoAtual: number;
  pontuacaoMaxima: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface ProjectItem {
  id: string;
  titulo: string;
  descricao?: string;
  ordem: number;
  ncs: NC[];
  pontuacaoAtual: number;
  pontuacaoMaxima: number;
}

export interface ProjectModule {
  id: string;
  titulo: string;
  ordem: number;
  itens: ProjectItem[];
}

// ==================== RELATÓRIOS ====================
export interface RelatorioItem {
  id: string;
  category: string;
  itemTitle: string;
  subItemId: string;
  subItemTitle: string;
  local: string;
  currentSituation: string;
  clientGuidance: string;
  responsible: string;
  whatWasDone: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  evaluation: string;
  photos: string[];
  adequacyReported: boolean;
  adequacyStatus: 'pending' | 'completed' | 'not_applicable';
  adequacyDetails: string;
  adequacyImages: string[];
  adequacyDate: string;
  changesDescription: string;
  treatmentDeadline: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Relatorio {
  id: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  itens: RelatorioItem[];
  statistics: {
    totalItems: number;
    completedItems: number;
    pendingItems: number;
    inProgressItems: number;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

