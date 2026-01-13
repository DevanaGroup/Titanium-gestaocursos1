import { tessPareto } from '../services/tessPareto';

async function testNewPayloadFormat() {
  console.log('🧪 Testando novo formato de payload...\n');

  // Dados de exemplo no formato solicitado
  const payload = {
    nomeempresa: "Cerrado Engenharia Ltda",
    nomeprojeto: "Parque Eólico Goiabal",
    localizacao: "Ituiutaba - MG",
    tipoestudo: "EIA/RIMA - Estudo de Impacto Ambiental",
    termoreferencia: "TR_SEMA_2024_001.pdf",
    messages: [
      { 
        role: "user", 
        content: "Dados iniciais coletados para elaboração de estudo ambiental" 
      }
    ],
    file_ids: [73325, 73326],
    wait_execution: false
  };

  console.log('📋 Payload no formato solicitado:', JSON.stringify(payload, null, 2));

  // Testar envio para webhook
  try {
    console.log('\n🔄 Enviando para webhook...');
    const response = await fetch('https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook respondeu com sucesso!');
      console.log('📥 Resposta:', JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Erro no webhook:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Detalhes do erro:', errorText);
    }
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
  }

  // Testar com arquivo real se Tess Pareto estiver configurado
  if (tessPareto.isConfigured()) {
    console.log('\n🔄 Testando com arquivo real...');
    
    try {
      // Criar arquivo de teste
      const testContent = `
TERMO DE REFERÊNCIA - TESTE
============================

Empresa: Cerrado Engenharia Ltda
Projeto: Parque Eólico Goiabal
Localização: Ituiutaba - MG
Tipo de Estudo: EIA/RIMA

Este é um arquivo de teste para verificar o upload e processamento.
Data: ${new Date().toISOString()}
`;

      const testFile = new File([testContent], 'TR_TESTE.pdf', { type: 'application/pdf' });
      
      // Upload para Tess Pareto
      const tessResponse = await tessPareto.uploadFile(testFile, false);
      console.log('✅ Arquivo enviado para Tess Pareto:', tessResponse);

      // Payload com arquivo real
      const payloadWithRealFile = {
        ...payload,
        termoreferencia: tessResponse.filename,
        file_ids: [tessResponse.id]
      };

      console.log('\n📋 Payload com arquivo real:');
      console.log(JSON.stringify(payloadWithRealFile, null, 2));

      // Enviar para webhook
      const webhookResponse = await fetch('https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadWithRealFile)
      });

      if (webhookResponse.ok) {
        const result = await webhookResponse.json();
        console.log('✅ Webhook com arquivo real respondeu com sucesso!');
        console.log('📥 Resposta:', JSON.stringify(result, null, 2));
      } else {
        console.error('❌ Erro no webhook com arquivo real:', webhookResponse.status);
      }

    } catch (error) {
      console.error('❌ Erro no teste com arquivo real:', error);
    }
  } else {
    console.log('\n⚠️  Tess Pareto não configurado, pulando teste com arquivo real');
  }

  console.log('\n🏁 Teste concluído!');
}

// Executar o teste
testNewPayloadFormat().catch(console.error); 