interface FolderStructure {
  name: string;
  description: string;
  allowedFileTypes: string[];
  subFolders?: FolderStructure[];
  // Campos para controle de acesso
  isRestricted?: boolean;
  allowedRoles?: string[];
}

export const clientFolderStructure: FolderStructure[] = [
  {
    name: "Documentos Gerais",
    description: "Armazenar documentos administrativos do cliente e da propriedade",
    allowedFileTypes: [],
    subFolders: [
      {
        name: "Documentos Pessoais",
        description: "Documentos de identificação pessoal",
        allowedFileTypes: ["pdf", "jpg", "png"]
      },
      {
        name: "Comprovante de Endereço",
        description: "Comprovantes de residência",
        allowedFileTypes: ["pdf", "jpg"]
      },
      {
        name: "Documentos do Imóvel",
        description: "Documentação do imóvel",
        allowedFileTypes: ["pdf", "jpg"]
      },
      {
        name: "Procurações e Autorizações",
        description: "Documentos legais e autorizações",
        allowedFileTypes: ["pdf"]
      }
    ]
  },
  {
    name: "Questionário Padrão",
    description: "Formulários para preenchimento de informações da empresa",
    allowedFileTypes: [],
    subFolders: [
      {
        name: "Dados da Empresa",
        description: "Informações cadastrais da empresa",
        allowedFileTypes: ["docx", "pdf"]
      },
      {
        name: "Estrutura Operacional",
        description: "Detalhes da operação e capacidade",
        allowedFileTypes: ["docx", "pdf"]
      },
      {
        name: "Tipologia e Atividade",
        description: "Classificação e atividades da empresa",
        allowedFileTypes: ["docx", "pdf"]
      },
      {
        name: "Assessorias e Responsáveis Técnicos",
        description: "Informações dos responsáveis técnicos",
        allowedFileTypes: ["docx", "pdf"]
      }
    ]
  },
  {
    name: "Banco de Imagens",
    description: "Armazenar fotos organizadas por local",
    allowedFileTypes: [],
    subFolders: [
      {
        name: "Recepção",
        description: "Fotos da área de recepção",
        allowedFileTypes: ["jpg", "png"]
      },
      {
        name: "Operação",
        description: "Fotos da área de operação",
        allowedFileTypes: ["jpg", "png"]
      },
      {
        name: "Recebimento de Matéria Prima",
        description: "Fotos do processo de recebimento",
        allowedFileTypes: ["jpg", "png"]
      },
      {
        name: "Armazenamento de Matéria Prima",
        description: "Fotos da área de armazenamento",
        allowedFileTypes: ["jpg", "png"]
      },
      {
        name: "ETE",
        description: "Fotos da Estação de Tratamento de Efluentes",
        allowedFileTypes: ["jpg", "png"]
      },
      {
        name: "Área Externa",
        description: "Fotos das áreas externas",
        allowedFileTypes: ["jpg", "png"]
      }
    ]
  },
  {
    name: "Fluxograma",
    description: "Armazenar fluxogramas manuais ou escaneados",
    allowedFileTypes: [],
    subFolders: [
      {
        name: "Processo Produtivo",
        description: "Fluxogramas do processo de produção",
        allowedFileTypes: ["pdf", "jpg", "png"]
      },
      {
        name: "ETE",
        description: "Fluxogramas da Estação de Tratamento",
        allowedFileTypes: ["pdf", "jpg", "png"]
      },
      {
        name: "Recepção",
        description: "Fluxogramas da área de recepção",
        allowedFileTypes: ["pdf", "jpg", "png"]
      }
    ]
  },
  {
    name: "Equipamentos e Matérias Primas",
    description: "Listar e registrar os equipamentos e insumos utilizados",
    allowedFileTypes: [],
    subFolders: [
      {
        name: "Equipamentos",
        description: "Registro de equipamentos",
        allowedFileTypes: ["docx", "jpg"],
        subFolders: [
          {
            name: "Recepção",
            description: "Equipamentos da recepção",
            allowedFileTypes: ["docx", "jpg"]
          },
          {
            name: "Produção",
            description: "Equipamentos da produção",
            allowedFileTypes: ["docx", "jpg"]
          },
          {
            name: "Armazenamento",
            description: "Equipamentos de armazenamento",
            allowedFileTypes: ["docx", "jpg"]
          },
          {
            name: "ETE",
            description: "Equipamentos da ETE",
            allowedFileTypes: ["docx", "jpg"]
          },
          {
            name: "Externo",
            description: "Equipamentos externos",
            allowedFileTypes: ["docx", "jpg"]
          }
        ]
      },
      {
        name: "Matérias-Primas",
        description: "Registro de matérias-primas",
        allowedFileTypes: ["docx", "jpg"],
        subFolders: [
          {
            name: "Armazenamento",
            description: "Armazenamento de matérias-primas",
            allowedFileTypes: ["docx", "jpg"]
          },
          {
            name: "Recebimento",
            description: "Recebimento de matérias-primas",
            allowedFileTypes: ["docx", "jpg"]
          },
          {
            name: "Utilização",
            description: "Utilização de matérias-primas",
            allowedFileTypes: ["docx", "jpg"]
          }
        ]
      }
    ]
  },
  {
    name: "Documentos Prontos",
    description: "Armazenar documentos finais para envio ou assinatura",
    allowedFileTypes: [],
    subFolders: [
      {
        name: "Relatórios Mensais",
        description: "Relatórios de acompanhamento mensal",
        allowedFileTypes: ["pdf", "docx", "xlsx"]
      },
      {
        name: "Relatórios de Visita",
        description: "Relatórios de visitas técnicas",
        allowedFileTypes: ["pdf", "docx", "xlsx"]
      },
      {
        name: "Documentos para Órgãos Ambientais",
        description: "Documentação para órgãos reguladores",
        allowedFileTypes: ["pdf", "docx", "xlsx"]
      },
      {
        name: "Protocolos e Comprovantes",
        description: "Comprovantes de entrega e protocolos",
        allowedFileTypes: ["pdf", "jpg"]
      }
    ]
  },
  {
    name: "Documentos Confidenciais",
    description: "Documentos sensíveis e informações confidenciais - Acesso restrito",
    allowedFileTypes: [],
    isRestricted: true,
    allowedRoles: ["Presidente", "Diretor Financeiro", "Diretor de TI"],
    subFolders: [
      {
        name: "Contratos e Acordos",
        description: "Contratos confidenciais e acordos especiais",
        allowedFileTypes: ["pdf", "docx"],
        isRestricted: true,
        allowedRoles: ["Presidente", "Diretor Financeiro", "Diretor de TI"]
      },
      {
        name: "Dados Financeiros Sensíveis",
        description: "Informações financeiras confidenciais",
        allowedFileTypes: ["pdf", "xlsx", "docx"],
        isRestricted: true,
        allowedRoles: ["Presidente", "Diretor Financeiro", "Diretor de TI"]
      },
      {
        name: "Documentos Jurídicos",
        description: "Documentação jurídica sensível",
        allowedFileTypes: ["pdf", "docx"],
        isRestricted: true,
        allowedRoles: ["Presidente", "Diretor Financeiro", "Diretor de TI"]
      },
      {
        name: "Estratégicos e Proprietários",
        description: "Documentos estratégicos e informações proprietárias",
        allowedFileTypes: ["pdf", "docx", "xlsx"],
        isRestricted: true,
        allowedRoles: ["Presidente", "Diretor Financeiro", "Diretor de TI"]
      }
    ]
  }
]; 