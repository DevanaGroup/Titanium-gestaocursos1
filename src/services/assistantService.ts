import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  orderBy,
  increment
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const ASSISTANTS_COLLECTION = 'assistants';

// Tipos de campos dinâmicos
export type FieldType = 'text' | 'textarea' | 'dropdown' | 'file' | 'multiple-files';

export interface DynamicField {
  id: string;
  variableName: string;
  label: string;
  placeholder?: string;
  description?: string;
  type: FieldType;
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    fileTypes?: string[];
    maxFileSize?: number; // em MB
    allowMultiple?: boolean;
  };
  options?: string[]; // Para dropdown
}

// Interface para assistente global
export interface Assistant {
  id: string;
  name: string;
  description: string;
  aiModel: string;
  agentId: string; // ID do agente de IA para fluxos
  isActive: boolean;
  messageCount: number;
  efficiency: number;
  createdAt: Date;
  updatedAt: Date;
  lastUsed: Date | null;
  isGlobal: boolean; // Todos os assistentes são globais agora
  dynamicFields?: DynamicField[]; // Campos dinâmicos
}

// Converter dados do Firestore para Assistant
const convertFirestoreToAssistant = (doc: any): Assistant => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    aiModel: data.aiModel,
    agentId: data.agentId || '',
    isActive: data.isActive,
    messageCount: data.messageCount || 0,
    efficiency: data.efficiency || 100,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    lastUsed: data.lastUsed?.toDate() || null,
    isGlobal: true, // Todos são globais
    dynamicFields: data.dynamicFields || []
  };
};

// Buscar todos os assistentes globais
export const getAssistants = async (): Promise<Assistant[]> => {
  try {
    // Buscar todos os assistentes globais (sem filtro de usuário)
    const assistantsQuery = query(
      collection(db, ASSISTANTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const assistantsSnapshot = await getDocs(assistantsQuery);
    const assistants = assistantsSnapshot.docs.map(convertFirestoreToAssistant);
    
    console.log(`✅ Encontrados ${assistants.length} assistentes globais`);
    
    return assistants;
    
  } catch (error) {
    console.error('❌ Erro ao buscar assistentes globais:', error);
    // Fallback: retornar array vazio
    return [];
  }
};

// Função para compatibilidade (pode ser removida depois)
export const getUserAssistants = async (): Promise<Assistant[]> => {
  return getAssistants();
};

// Criar novo assistente global
export const createAssistant = async (assistantData: {
  name: string;
  description: string;
  aiModel: string;
  agentId: string;
  dynamicFields?: DynamicField[];
}): Promise<Assistant> => {
  const newAssistant: Assistant = {
    id: `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: assistantData.name,
    description: assistantData.description,
    aiModel: assistantData.aiModel,
    agentId: assistantData.agentId,
    isActive: true,
    messageCount: 0,
    efficiency: 100,
    isGlobal: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsed: null,
    dynamicFields: assistantData.dynamicFields || []
  };

  try {
    // Salvar no Firestore
    const docRef = await addDoc(collection(db, ASSISTANTS_COLLECTION), {
      name: assistantData.name,
      description: assistantData.description,
      aiModel: assistantData.aiModel,
      agentId: assistantData.agentId,
      isActive: true,
      messageCount: 0,
      efficiency: 100,
      isGlobal: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastUsed: null,
      dynamicFields: assistantData.dynamicFields || []
    });

    // Usar o ID do Firestore
    newAssistant.id = docRef.id;
    
    console.log('✅ Assistente global salvo no Firestore com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao salvar assistente global:', error);
    throw new Error('Não foi possível criar o assistente');
  }

  return newAssistant;
};

// Atualizar último uso do assistente
export const updateLastUsed = async (assistantId: string): Promise<void> => {
  try {
    const docRef = doc(db, ASSISTANTS_COLLECTION, assistantId);
    await updateDoc(docRef, {
      lastUsed: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Erro ao atualizar último uso:', error);
  }
};

// Incrementar contador de mensagens
export const incrementMessageCount = async (assistantId: string): Promise<void> => {
  try {
    const docRef = doc(db, ASSISTANTS_COLLECTION, assistantId);
    await updateDoc(docRef, {
      messageCount: increment(1),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Erro ao incrementar contador de mensagens:', error);
  }
};

// Atualizar status do assistente
export const updateAssistantStatus = async (assistantId: string, isActive: boolean): Promise<void> => {
  try {
    const docRef = doc(db, ASSISTANTS_COLLECTION, assistantId);
    await updateDoc(docRef, {
      isActive,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Erro ao atualizar status do assistente:', error);
  }
};

// Deletar assistente
export const deleteAssistant = async (assistantId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, ASSISTANTS_COLLECTION, assistantId));
  } catch (error) {
    console.error('Erro ao deletar assistente:', error);
    throw error;
  }
};

// Atualizar assistente
export const updateAssistant = async (assistantId: string, data: {
  name?: string;
  description?: string;
  aiModel?: string;
}): Promise<void> => {
  try {
    const docRef = doc(db, ASSISTANTS_COLLECTION, assistantId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Erro ao atualizar assistente:', error);
    throw error;
  }
};

// Função para criar o assistente SEIA-MASTER
export const createSeiaMasterAssistant = async (): Promise<Assistant> => {
  const seiaMasterFields: DynamicField[] = [
    {
      id: 'nomeEmpresa',
      variableName: 'nomeEmpresa',
      label: 'Nome da Empresa Cliente',
      placeholder: 'Digite o nome completo da empresa',
      description: 'Razão social completa da empresa solicitante do estudo',
      type: 'text',
      required: true,
      validation: {
        minLength: 3
      }
    },
    {
      id: 'nomeProjeto',
      variableName: 'nomeProjeto',
      label: 'Nome do Projeto/Empreendimento',
      placeholder: 'Ex: Expansão da Unidade Industrial ABC',
      description: 'Identificação clara do projeto ou empreendimento',
      type: 'text',
      required: true
    },
    {
      id: 'localizacao',
      variableName: 'localizacao',
      label: 'Localização Completa',
      placeholder: 'Endereço completo incluindo coordenadas geográficas (lat/long)',
      description: 'Endereço detalhado e coordenadas em formato decimal ou UTM',
      type: 'textarea',
      required: true
    },
    {
      id: 'tipoEstudo',
      variableName: 'tipoEstudo',
      label: 'Tipo de Estudo Ambiental',
      description: 'Selecione o tipo de estudo a ser elaborado',
      type: 'dropdown',
      required: true,
      options: [
        'EIA/RIMA - Estudo de Impacto Ambiental',
        'MCE - Memorial de Caracterização do Empreendimento',
        'PCA - Plano de Controle Ambiental',
        'RAP - Relatório Ambiental Preliminar',
        'PGRS - Plano de Gerenciamento de Resíduos Sólidos',
        'Inventário de Fauna',
        'Inventário de Flora',
        'Outorga de Uso de Água',
        'Análise de Risco Ambiental',
        'Estudo de Viabilidade Ambiental',
        'RCA - Relatório de Controle Ambiental',
        'RADA - Relatório de Avaliação de Desempenho Ambiental'
      ]
    },
    {
      id: 'termoReferencia',
      variableName: 'termoReferencia',
      label: 'Termo de Referência Oficial (PDF)',
      description: 'Upload do TR emitido pelo órgão ambiental competente',
      type: 'file',
      required: true,
      validation: {
        fileTypes: ['.pdf'],
        maxFileSize: 200
      }
    },
    {
      id: 'documentacaoTecnica',
      variableName: 'documentacaoTecnica',
      label: 'Documentação Técnica do Projeto',
      description: 'Projetos, memoriais descritivos, especificações técnicas',
      type: 'multiple-files',
      required: false,
      validation: {
        fileTypes: ['.pdf', '.docx', '.doc'],
        maxFileSize: 200,
        allowMultiple: true
      }
    },
    {
      id: 'planilhasDados',
      variableName: 'planilhasDados',
      label: 'Planilhas com Dados e Medições',
      description: 'Dados de monitoramento, análises laboratoriais, medições',
      type: 'multiple-files',
      required: false,
      validation: {
        fileTypes: ['.xlsx', '.xls', '.csv'],
        allowMultiple: true
      }
    },
    {
      id: 'fotosCampo',
      variableName: 'fotosCampo',
      label: 'Fotografias do Local',
      description: 'Imagens do local do empreendimento e área de influência',
      type: 'multiple-files',
      required: false,
      validation: {
        fileTypes: ['.jpg', '.jpeg', '.png'],
        allowMultiple: true
      }
    }
  ];

  return await createAssistant({
    name: 'SEIA-MASTER',
    description: 'Assistente especializado em estudos ambientais com coleta de dados estruturada para elaboração de EIA/RIMA, MCE, PCA e outros estudos ambientais.',
    aiModel: 'GPT-4 Turbo',
    agentId: '23448',
    dynamicFields: seiaMasterFields
  });
}; 