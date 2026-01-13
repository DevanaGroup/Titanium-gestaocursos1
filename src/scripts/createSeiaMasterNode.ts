import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DynamicField } from '../services/assistantService';

// Inicializar Firebase Admin
if (!getApps().length) {
  // Usar variáveis de ambiente ou chave de serviço
  const serviceAccount = require('../../firebase-key.json'); // Assumindo que você tem o arquivo de chave
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'cerrado-web-genesis-79'
  });
}

const db = getFirestore();

async function createSeiaMasterAssistant() {
  try {
    console.log('🤖 Iniciando criação do assistente SEIA-MASTER...');
    
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

    const assistantData = {
      name: 'SEIA-MASTER',
      description: 'Assistente especializado em estudos ambientais com coleta de dados estruturada para elaboração de EIA/RIMA, MCE, PCA e outros estudos ambientais.',
      aiModel: 'GPT-4 Turbo',
      agentId: '23448',
      isActive: true,
      messageCount: 0,
      efficiency: 100,
      isGlobal: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: null,
      dynamicFields: seiaMasterFields
    };

    const docRef = await db.collection('assistants').add(assistantData);
    
    console.log('✅ SEIA-MASTER criado com sucesso!');
    console.log('📋 Detalhes do assistente:');
    console.log(`   - ID: ${docRef.id}`);
    console.log(`   - Nome: ${assistantData.name}`);
    console.log(`   - Agent ID: ${assistantData.agentId}`);
    console.log(`   - Campos dinâmicos: ${assistantData.dynamicFields.length} campos`);
    
    console.log('📝 Campos configurados:');
    assistantData.dynamicFields.forEach((field, index) => {
      console.log(`   ${index + 1}. ${field.label} (${field.type}) ${field.required ? '- Obrigatório' : ''}`);
    });
    
    console.log('\n🎯 O assistente SEIA-MASTER está pronto para uso!');
    console.log('   - Especializado em estudos ambientais');
    console.log('   - Coleta dados estruturados antes da conversa');
    console.log('   - Integração com n8n via webhook');
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Erro ao criar SEIA-MASTER:', error);
    throw error;
  }
}

// Executar o script
createSeiaMasterAssistant()
  .then(() => {
    console.log('🚀 Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro na execução do script:', error);
    process.exit(1);
  }); 