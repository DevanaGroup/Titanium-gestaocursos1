#!/usr/bin/env node

import { tessPareto } from '../services/tessPareto';

console.log('🧪 Testando integração com Tess Pareto...');

// Função para testar upload com API mock
const testTessPareto = async () => {
  console.log('📋 Configuração atual:');
  console.log('- API configurada:', tessPareto.isConfigured());
  
  if (!tessPareto.isConfigured()) {
    console.log('⚠️ API key não configurada');
    console.log('');
    console.log('📝 Para configurar:');
    console.log('1. Obtenha sua API key do Tess Pareto');
    console.log('2. Configure no código: tessPareto.setApiKey("sua_api_key")');
    console.log('3. Ou crie arquivo .env com: TESS_API_KEY=sua_api_key');
    console.log('');
    console.log('🔧 Exemplo de uso:');
    console.log('```typescript');
    console.log('import { tessPareto } from "./services/tessPareto";');
    console.log('');
    console.log('// Configurar API key');
    console.log('tessPareto.setApiKey("YOUR_API_KEY");');
    console.log('');
    console.log('// Upload de arquivo');
    console.log('const response = await tessPareto.uploadFile(file, false);');
    console.log('console.log("Arquivo enviado:", response);');
    console.log('```');
    console.log('');
    console.log('📤 Resposta esperada:');
    console.log('{');
    console.log('  "id": 73325,');
    console.log('  "object": "file",');
    console.log('  "bytes": 35504128,');
    console.log('  "created_at": "2025-01-05T22:26:27+00:00",');
    console.log('  "filename": "endpoints.pdf",');
    console.log('  "credits": 0,');
    console.log('  "status": "waiting"');
    console.log('}');
    return;
  }

  // Se configurado, tentar um teste básico
  console.log('✅ API configurada - pronta para upload');
  console.log('');
  console.log('🔄 Para testar com arquivo real:');
  console.log('1. Use o componente de upload no frontend');
  console.log('2. Monitore os logs do console para ver o upload');
  console.log('3. Verifique se recebe objeto com ID em vez de base64');
};

// Executar teste
testTessPareto().catch(console.error);

export { testTessPareto }; 