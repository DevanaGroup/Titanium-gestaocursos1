// Script para testar integração com webhook incluindo arquivos base64
const testWebhookWithFiles = async () => {
  // Simular arquivos base64 (dados reais truncados para exemplo)
  const mockPdfContent = "data:application/pdf;base64,JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovTGVuZ3RoIDYgMCBSCi9GaWx0ZXIgL0ZsYXRlRGVjb2RlCj4+CnN0cmVhbQp4nDPQM1Qo5ypUKNCa..."; // PDF truncado
  const mockExcelContent = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQABgAIAAAAIQDd4U2s7QAAAP0CAAATAAAAeG..."; // Excel truncado
  const mockImageContent = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="; // Imagem 1x1 pixel

  // Estrutura separada: data (sistema) + form (formulário)
  const testMessages = [
    {
      content: "Dados iniciais coletados para elaboração de estudo ambiental com arquivos anexados",
      role: "user"
    }
  ];

  const testPayload = {
    data: {
      agentId: "23448",
      thread: "thread_test_" + Date.now(),
      assistantId: "seia-master-id",
      assistantName: "SEIA-MASTER",
      messages: testMessages,
      wait_execution: false,
      timestamp: new Date().toISOString()
    },
    form: {
      nomeempresa: "Cerrado Engenharia Ltda",
      nomeprojeto: "Expansão da Unidade Industrial de Beneficiamento",
      localizacao: "Rodovia GO-060, Km 15, Zona Industrial Norte, Goiânia/GO\nCoordenadas: -16.6869° S, -49.2648° W\nUTM: 22L 0206789 8154321",
      tipoestudo: "EIA/RIMA - Estudo de Impacto Ambiental",
      
      // Arquivo único com dados base64
      termoreferencia: {
        name: "TR_SEMA_2024_001.pdf",
        content: mockPdfContent,
        type: "application/pdf",
        size: 2048576 // 2MB
      },
      
      // Múltiplos arquivos com dados base64
      documentacaotecnica: [
        {
          name: "Memorial_Descritivo_Projeto.pdf",
          content: mockPdfContent,
          type: "application/pdf",
          size: 1536000 // 1.5MB
        },
        {
          name: "Plantas_Baixas_Industrial.pdf",
          content: mockPdfContent,
          type: "application/pdf",
          size: 3072000 // 3MB
        }
      ],
      
      planilhasdados: [
        {
          name: "Dados_Monitoramento_Agua.xlsx",
          content: mockExcelContent,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 512000 // 0.5MB
        },
        {
          name: "Analises_Solo_Laboratorio.xlsx",
          content: mockExcelContent,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 768000 // 0.75MB
        }
      ],
      
      fotoscampo: [
        {
          name: "Vista_Geral_Terreno_001.jpg",
          content: mockImageContent,
          type: "image/jpeg",
          size: 204800 // 200KB
        },
        {
          name: "Pontos_Amostragem_002.jpg",
          content: mockImageContent,
          type: "image/jpeg",
          size: 307200 // 300KB
        },
        {
          name: "Vegetacao_Nativa_003.jpg",
          content: mockImageContent,
          type: "image/jpeg",
          size: 256000 // 250KB
        }
      ],
      
      // Adicionando messages também no form
      messages: testMessages
    }
  };

  console.log('🚀 Testando integração com webhook incluindo arquivos...');
  console.log('📊 Estatísticas dos dados:');
  console.log(`  - Campos de texto: 4`);
  console.log(`  - Arquivo único: 1 (${(testPayload.form.termoreferencia.size / 1024 / 1024).toFixed(2)}MB)`);
  console.log(`  - Documentação técnica: ${testPayload.form.documentacaotecnica.length} arquivos`);
  console.log(`  - Planilhas: ${testPayload.form.planilhasdados.length} arquivos`);
  console.log(`  - Fotos: ${testPayload.form.fotoscampo.length} arquivos`);
  
  // Calcular tamanho total
  const totalSize = testPayload.form.termoreferencia.size + 
    testPayload.form.documentacaotecnica.reduce((sum, file) => sum + file.size, 0) +
    testPayload.form.planilhasdados.reduce((sum, file) => sum + file.size, 0) +
    testPayload.form.fotoscampo.reduce((sum, file) => sum + file.size, 0);
  
  console.log(`  - Tamanho total: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

  try {
    const response = await fetch('https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
              body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook com arquivos integrado com sucesso!');
      console.log('📥 Resposta recebida:', result);
      
      // Verificar se a resposta contém os dados dos arquivos
      if (result.responses && result.responses[0] && result.responses[0].answers) {
        const answers = result.responses[0].answers;
        console.log('📁 Verificação dos arquivos na resposta:');
        
                 Object.entries(answers).forEach(([key, value]) => {
           if (typeof value === 'object' && value !== null) {
             if (Array.isArray(value)) {
               console.log(`  - ${key}: ${value.length} arquivo(s)`);
             } else if ('name' in value && 'content' in value) {
               console.log(`  - ${key}: ${(value as any).name} (${(value as any).type})`);
             }
           }
         });
      }
    } else {
      console.error('❌ Erro na integração:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Detalhes do erro:', errorText);
    }
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
  }
};

// Executar teste
testWebhookWithFiles(); 