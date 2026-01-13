#!/usr/bin/env node

console.log('🚀 Testando estrutura com messages em data e form...');

// Simular uma estrutura de teste
const testMessages = [
  {
    content: "Dados iniciais coletados para elaboração de estudo ambiental",
    role: "user",
    timestamp: "2024-01-01T10:00:00.000Z"
  },
  {
    content: "Preciso de mais informações sobre o projeto",
    role: "user", 
    timestamp: "2024-01-01T10:05:00.000Z"
  }
];

const testPayload = {
  data: {
    agentId: "23448",
    thread: "thread_test_messages_" + Date.now(),
    assistantId: "seia-master-id",
    assistantName: "SEIA-MASTER",
    messages: testMessages,
    wait_execution: false,
    timestamp: new Date().toISOString()
  },
  form: {
    nomeempresa: "Cerrado Engenharia Ltda",
    nomeprojeto: "Expansão da Unidade Industrial",
    localizacao: "Goiânia/GO - Teste com Messages",
    tipoestudo: "EIA/RIMA - Estudo de Impacto Ambiental",
    messages: testMessages // Duplicação intencional
  }
};

console.log('📊 Verificando estrutura:');
console.log('✅ data.messages:', testPayload.data.messages.length, 'mensagens');
console.log('✅ form.messages:', testPayload.form.messages.length, 'mensagens');

// Verificar se as mensagens são idênticas
const messagesMatch = JSON.stringify(testPayload.data.messages) === JSON.stringify(testPayload.form.messages);
console.log('✅ Messages em data e form são idênticos:', messagesMatch);

// Mostrar exemplo de como seria processado no n8n
console.log('\n🔧 Exemplo de processamento no n8n:');
console.log('// Acesso aos dados do sistema');
console.log('const agentId = $json.data.agentId;');
console.log('const thread = $json.data.thread;');
console.log('const messagesFromData = $json.data.messages;');
console.log('');
console.log('// Acesso aos dados do formulário');
console.log('const nomeEmpresa = $json.form.nomeempresa;');
console.log('const projeto = $json.form.nomeprojeto;');
console.log('const messagesFromForm = $json.form.messages;');

// Simular envio para webhook
console.log('\n📤 Enviando para webhook...');
const webhookUrl = 'https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24';

try {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testPayload)
  });

  if (response.ok) {
    const result = await response.json();
    console.log('✅ Webhook respondeu com sucesso!');
    console.log('📋 Resposta:', JSON.stringify(result, null, 2));
  } else {
    console.log('❌ Webhook retornou erro:', response.status);
    const errorText = await response.text();
    console.log('📝 Detalhes do erro:', errorText);
  }
} catch (error) {
  console.log('❌ Erro ao conectar com webhook:', error);
}

console.log('\n🎯 Estrutura final validada:');
console.log('- data.messages: Array com histórico da conversa');
console.log('- form.messages: Array duplicado para facilitar processamento');
console.log('- Todos os campos do formulário + messages disponíveis em form');
console.log('- Metadados do sistema disponíveis em data'); 