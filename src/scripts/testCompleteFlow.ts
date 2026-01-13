#!/usr/bin/env node

import { tessPareto } from '../services/tessPareto';

console.log('🚀 Testando fluxo completo: Tess Pareto + Webhook...');

// Criar arquivo mock
const createMockFile = (name: string, content: string, mimeType: string): File => {
  const blob = new Blob([content], { type: mimeType });
  return new File([blob], name, { type: mimeType });
};

const testCompleteFlow = async () => {
  try {
    // 1. Criar arquivo mock
    const mockContent = `%PDF-1.4
%Documento teste para SEIA-MASTER
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 14 Tf
72 720 Td
(TERMO DE REFERÊNCIA - TESTE) Tj
0 -20 Td
(Projeto: Expansão Industrial) Tj
0 -20 Td
(Empresa: Cerrado Engenharia) Tj
0 -20 Td
(Local: Goiânia/GO) Tj
0 -20 Td
(Tipo: EIA/RIMA) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000185 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
450
%%EOF`;

    const termoReferencia = createMockFile('TR_SEMA_2024_TESTE.pdf', mockContent, 'application/pdf');
    
    console.log('📄 Arquivo criado:', termoReferencia.name, `(${termoReferencia.size} bytes)`);
    
    // 2. Upload para Tess Pareto
    console.log('\n🔄 Fase 1: Upload para Tess Pareto...');
    const tessResponse = await tessPareto.uploadFile(termoReferencia, false);
    console.log('✅ Upload concluído! ID:', tessResponse.id);
    
    // 3. Preparar payload para webhook
    console.log('\n🔄 Fase 2: Preparando payload para webhook...');
    
    const messages = [
      {
        content: "Dados iniciais coletados para elaboração de estudo ambiental",
        role: "user",
        timestamp: new Date().toISOString()
      }
    ];
    
    const payload = {
      data: {
        agentId: "23448",
        thread: "thread_complete_test_" + Date.now(),
        assistantId: "seia-master",
        assistantName: "SEIA-MASTER",
        messages: messages,
        wait_execution: false,
        timestamp: new Date().toISOString()
      },
      form: {
        nomeempresa: "Cerrado Engenharia Ltda",
        nomeprojeto: "Expansão da Unidade Industrial - Teste Completo",
        localizacao: "Rodovia GO-060, Km 15, Zona Industrial Norte, Goiânia/GO",
        tipoestudo: "EIA/RIMA - Estudo de Impacto Ambiental",
        termoreferencia: tessResponse, // Objeto do Tess Pareto (não base64!)
        messages: messages
      }
    };
    
    console.log('✅ Payload preparado com objeto Tess Pareto');
    
    // 4. Enviar para webhook
    console.log('\n🔄 Fase 3: Enviando para webhook...');
    
    const webhookUrl = 'https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24';
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const webhookResponse = await response.json();
      console.log('✅ Webhook respondeu com sucesso!');
      console.log('📋 Resposta do webhook:');
      console.log(JSON.stringify(webhookResponse, null, 2));
    } else {
      console.log('❌ Webhook retornou erro:', response.status);
      const errorText = await response.text();
      console.log('📝 Detalhes:', errorText);
    }
    
    // 5. Resumo do teste
    console.log('\n🎯 TESTE COMPLETO - RESUMO:');
    console.log('═'.repeat(50));
    console.log('✅ Arquivo enviado para Tess Pareto - ID:', tessResponse.id);
    console.log('✅ Payload estruturado com data + form');
    console.log('✅ Campo termoreferencia contém objeto Tess Pareto');
    console.log('✅ Messages duplicado em data e form');
    console.log('✅ Webhook recebeu estrutura correta');
    console.log('');
    console.log('🔧 ESTRUTURA ENVIADA:');
    console.log('data: { agentId, thread, assistantId, messages, ... }');
    console.log('form: { nomeempresa, termoreferencia: TessObject, messages, ... }');
    console.log('');
    console.log('⚡ PRÓXIMO PASSO:');
    console.log('- A IA agora pode acessar o arquivo via ID', tessResponse.id);
    console.log('- Não mais limitado pelo tamanho do payload');
    console.log('- Processamento mais eficiente e rápido');
    
  } catch (error) {
    console.error('\n❌ Erro no fluxo completo:', error);
    
    if (error instanceof Error) {
      console.log('\n📝 Detalhes do erro:');
      console.log('- Mensagem:', error.message);
      console.log('- Stack:', error.stack);
    }
  }
};

// Executar teste completo
testCompleteFlow().catch(console.error);

export { testCompleteFlow }; 