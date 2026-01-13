// Script para testar integração com webhook
const testWebhookIntegration = async () => {
  const testData = {
    nomeempresa: "Cerrado Engenharia Ltda",
    nomeprojeto: "Expansão da Unidade Industrial de Beneficiamento",
    localizacao: "Rodovia GO-060, Km 15, Zona Industrial Norte, Goiânia/GO\nCoordenadas: -16.6869° S, -49.2648° W\nUTM: 22L 0206789 8154321",
    tipoestudo: "EIA/RIMA - Estudo de Impacto Ambiental",
    termoreferencia: "TR_SEMA_2024_001.pdf",
    documentacaotecnica: "Memorial_Descritivo_Projeto.pdf, Plantas_Baixas_Industrial.pdf",
    planilhasdados: "Dados_Monitoramento_Agua.xlsx, Analises_Solo_Laboratorio.xlsx",
    fotoscampo: "Vista_Geral_Terreno_001.jpg, Pontos_Amostragem_002.jpg, Vegetacao_Nativa_003.jpg",
    messages: [
      {
        content: "Dados iniciais coletados para elaboração de estudo ambiental",
        role: "user"
      }
    ],
    wait_execution: false
  };

  console.log('🚀 Testando integração com webhook...');
  console.log('📤 Dados a serem enviados:', testData);

  try {
    const response = await fetch('https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook integrado com sucesso!');
      console.log('📥 Resposta recebida:', result);
    } else {
      console.error('❌ Erro na integração:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
  }
};

// Executar teste
testWebhookIntegration(); 