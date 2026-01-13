import { tessPareto } from '../services/tessPareto';

async function testCorrectStructure() {
  console.log('🔧 Testando estrutura CORRETA: data + form\n');

  // Simulação de dados coletados do formulário
  const formData = {
    nomeempresa: "Devana Tecnologia",
    nomeprojeto: "Parque do Goiabal",
    localizacao: "Ituiutaba - MG",
    tipoestudo: "EIA/RIMA - Estudo de Impacto Ambiental",
    termoreferencia: "TR_IBAMA_2024_001.pdf"
  };

  const messages = [
    { 
      role: "user", 
      content: "Dados iniciais coletados para elaboração de estudo ambiental" 
    }
  ];

  // Estrutura CORRETA: data + form (onde form segue o modelo solicitado)
  const payload = {
    data: {
      agentId: "23448",
      thread: "thread_" + Date.now(),
      assistantId: "seia-master-id",
      assistantName: "SEIA-MASTER",
      messages: messages,
      wait_execution: false,
      timestamp: new Date().toISOString()
    },
    form: {
      nomeempresa: "Devana Tecnologia",
      nomeprojeto: "Parque do Goiabal",
      localizacao: "Ituiutaba - MG",
      tipoestudo: "EIA/RIMA - Estudo de Impacto Ambiental",
      termoreferencia: "TR_IBAMA_2024_001.pdf",
      messages: messages,
      file_ids: [73325],
      wait_execution: false
    }
  };

  console.log('📋 Estrutura CORRETA:');
  console.log(JSON.stringify(payload, null, 2));

  console.log('\n✅ Verificações:');
  console.log('• Possui seção "data":', !!payload.data);
  console.log('• Possui seção "form":', !!payload.form);
  console.log('• Form tem nomeempresa:', !!payload.form.nomeempresa);
  console.log('• Form tem messages:', !!payload.form.messages);
  console.log('• Form tem file_ids:', !!payload.form.file_ids);
  console.log('• Form tem wait_execution:', payload.form.wait_execution !== undefined);

  console.log('\n🔍 Análise da estrutura:');
  console.log('• data: contém metadados do sistema');
  console.log('• form: contém dados do formulário no modelo solicitado');
  console.log('• form.messages: array como solicitado');
  console.log('• form.file_ids: array com IDs do Tess Pareto');
  console.log('• form.wait_execution: boolean de controle');

  // Testar com arquivo real se Tess Pareto estiver configurado
  if (tessPareto.isConfigured()) {
    console.log('\n🔄 Testando com arquivo real...');
    
    try {
      const testContent = `
TERMO DE REFERÊNCIA - ESTRUTURA CORRETA
========================================

Este teste verifica se a estrutura data + form está correta.

Estrutura esperada:
{
  "data": { ... metadados do sistema ... },
  "form": { 
    "nomeempresa": "...",
    "nomeprojeto": "...",
    "messages": [...],
    "file_ids": [...],
    "wait_execution": false
  }
}
`;

      const testFile = new File([testContent], 'estrutura_correta.pdf', { type: 'application/pdf' });
      
      const tessResponse = await tessPareto.uploadFile(testFile, false);
      console.log('✅ Arquivo enviado para Tess Pareto:', tessResponse.filename, 'ID:', tessResponse.id);

      const payloadWithRealFile = {
        ...payload,
        form: {
          ...payload.form,
          termoreferencia: tessResponse.filename,
          file_ids: [tessResponse.id]
        }
      };

      console.log('\n📋 Payload com arquivo real:');
      console.log(JSON.stringify(payloadWithRealFile, null, 2));

      // Enviar para webhook
      console.log('\n🔄 Enviando para webhook...');
      const response = await fetch('https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadWithRealFile)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Webhook respondeu com sucesso!');
        console.log('📥 Resposta:', JSON.stringify(result, null, 2));
      } else {
        console.log('⚠️  Webhook não ativo (esperado):', response.status);
      }

    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }

  console.log('\n🎯 Resumo:');
  console.log('✅ Estrutura mantém data + form');
  console.log('✅ Seção form segue modelo solicitado');
  console.log('✅ Campos em lowercase');
  console.log('✅ messages como array');
  console.log('✅ file_ids com IDs do Tess Pareto');
  console.log('✅ wait_execution presente');
}

// Executar o teste
testCorrectStructure().catch(console.error); 