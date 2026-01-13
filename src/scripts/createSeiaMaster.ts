import { createSeiaMasterAssistant } from '../services/assistantService';

async function createSeiaMasterAssistantScript() {
  try {
    console.log('🤖 Iniciando criação do assistente SEIA-MASTER...');
    
    const seiaMaster = await createSeiaMasterAssistant();
    
    console.log('✅ SEIA-MASTER criado com sucesso!');
    console.log('📋 Detalhes do assistente:');
    console.log(`   - ID: ${seiaMaster.id}`);
    console.log(`   - Nome: ${seiaMaster.name}`);
    console.log(`   - Agent ID: ${seiaMaster.agentId}`);
    console.log(`   - Campos dinâmicos: ${seiaMaster.dynamicFields?.length || 0} campos`);
    
    if (seiaMaster.dynamicFields) {
      console.log('📝 Campos configurados:');
      seiaMaster.dynamicFields.forEach((field, index) => {
        console.log(`   ${index + 1}. ${field.label} (${field.type}) ${field.required ? '- Obrigatório' : ''}`);
      });
    }
    
    console.log('\n🎯 O assistente SEIA-MASTER está pronto para uso!');
    console.log('   - Especializado em estudos ambientais');
    console.log('   - Coleta dados estruturados antes da conversa');
    console.log('   - Integração com n8n via webhook');
    
  } catch (error) {
    console.error('❌ Erro ao criar SEIA-MASTER:', error);
    process.exit(1);
  }
}

// Executar o script
createSeiaMasterAssistantScript(); 