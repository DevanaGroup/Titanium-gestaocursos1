#!/usr/bin/env node

import { tessPareto } from '../services/tessPareto';

console.log('🧪 Testando upload real para Tess Pareto...');

// Criar um arquivo mock para teste
const createMockFile = (name: string, content: string, mimeType: string): File => {
  const blob = new Blob([content], { type: mimeType });
  return new File([blob], name, { type: mimeType });
};

const testRealUpload = async () => {
  console.log('📋 Verificando configuração...');
  console.log('- API configurada:', tessPareto.isConfigured());
  
  if (!tessPareto.isConfigured()) {
    console.log('❌ API não configurada - não é possível testar upload');
    return;
  }

  console.log('✅ API configurada! Testando upload...');
  
  try {
    // Criar arquivo mock
    const mockContent = `%PDF-1.4
%Mock PDF for testing
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
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Teste Tess Pareto) Tj
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
270
%%EOF`;

    const mockFile = createMockFile('teste_tess_pareto.pdf', mockContent, 'application/pdf');
    
    console.log('📄 Arquivo mock criado:');
    console.log(`- Nome: ${mockFile.name}`);
    console.log(`- Tamanho: ${mockFile.size} bytes`);
    console.log(`- Tipo: ${mockFile.type}`);
    
    console.log('\n🔄 Fazendo upload para Tess Pareto...');
    
    // Fazer upload
    const response = await tessPareto.uploadFile(mockFile, false);
    
    console.log('\n✅ Upload realizado com sucesso!');
    console.log('📋 Resposta da API:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n🎯 Teste concluído!');
    console.log('- Arquivo foi enviado para Tess Pareto');
    console.log('- ID recebido:', response.id);
    console.log('- Status:', response.status);
    console.log('- Este ID deve ser usado no webhook em vez do base64');
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
    
    if (error instanceof Error) {
      console.log('\n📝 Detalhes do erro:');
      console.log('- Mensagem:', error.message);
      console.log('- Tipo:', error.constructor.name);
    }
    
    console.log('\n🔧 Possíveis soluções:');
    console.log('1. Verificar se a API key está correta');
    console.log('2. Verificar conectividade com https://tess.pareto.io');
    console.log('3. Verificar se há limites de rate limit ou quota');
  }
};

// Executar teste
testRealUpload().catch(console.error);

export { testRealUpload }; 