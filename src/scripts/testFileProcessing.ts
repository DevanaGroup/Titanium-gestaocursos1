import { tessPareto } from '../services/tessPareto';

async function testFileProcessing() {
  console.log('🧪 Testando processamento de arquivos no Tess Pareto...\n');

  if (!tessPareto.isConfigured()) {
    console.log('❌ Tess Pareto não configurado. Abortando teste.');
    return;
  }

  try {
    // Criar arquivo de teste
    const testContent = `
TERMO DE REFERÊNCIA - TESTE DE PROCESSAMENTO
===========================================

Este arquivo será enviado para o Tess Pareto e processado automaticamente.

Dados do teste:
- Data: ${new Date().toISOString()}
- Arquivo: teste_processamento.pdf
- Finalidade: Verificar se o processamento está funcionando

Conteúdo do Estudo:
1. Identificação do Empreendimento
2. Caracterização do Meio Ambiente
3. Análise de Impactos Ambientais
4. Medidas Mitigadoras
5. Programas de Monitoramento

Este é um teste para verificar se o arquivo está sendo processado corretamente
pela API do Tess Pareto após o upload.
`;

    const testFile = new File([testContent], 'teste_processamento.pdf', { type: 'application/pdf' });
    
    console.log('📁 Arquivo de teste criado:', testFile.name);
    console.log('📏 Tamanho:', testFile.size, 'bytes');
    console.log('📋 Tipo:', testFile.type);

    // Teste 1: Upload simples sem processamento
    console.log('\n🔄 Teste 1: Upload simples...');
    const uploadResult = await tessPareto.uploadFile(testFile, false);
    console.log('✅ Upload concluído:', uploadResult.filename, 'ID:', uploadResult.id);
    console.log('📊 Status inicial:', uploadResult.status);

    // Teste 2: Processamento manual
    console.log('\n🔄 Teste 2: Processamento manual...');
    try {
      const processResult = await tessPareto.processFile(uploadResult.id);
      console.log('✅ Processamento concluído:', processResult);
    } catch (error) {
      console.log('⚠️  Erro no processamento manual:', error);
    }

    // Aguardar um pouco antes do próximo teste
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Teste 3: Upload e processamento automático
    console.log('\n🔄 Teste 3: Upload e processamento automático...');
    const autoResult = await tessPareto.uploadAndProcessFile(testFile, true);
    console.log('✅ Upload e processamento concluído:', autoResult.file.filename, 'ID:', autoResult.file.id);
    console.log('📊 Status do arquivo:', autoResult.file.status);
    if (autoResult.processResult) {
      console.log('📋 Resultado do processamento:', autoResult.processResult);
    }

    // Teste 4: Verificar status após processamento
    console.log('\n🔄 Teste 4: Verificando status final...');
    const finalStatus = await tessPareto.getFileStatus(autoResult.file.id);
    console.log('✅ Status final:', finalStatus.status);
    console.log('📊 Arquivo final:', finalStatus);

    // Teste 5: Processamento de múltiplos arquivos
    console.log('\n🔄 Teste 5: Processamento de múltiplos arquivos...');
    const multipleFiles = [
      new File(['Arquivo 1'], 'arquivo1.txt', { type: 'text/plain' }),
      new File(['Arquivo 2'], 'arquivo2.txt', { type: 'text/plain' })
    ];

    const multipleResults = await tessPareto.uploadMultipleFiles(multipleFiles, false);
    console.log('✅ Múltiplos uploads concluídos:', multipleResults.length, 'arquivos');
    
    const fileIds = multipleResults.map(result => result.id);
    console.log('📋 IDs dos arquivos:', fileIds);

    try {
      const multipleProcessResults = await tessPareto.processMultipleFiles(fileIds);
      console.log('✅ Processamento múltiplo concluído:', multipleProcessResults.length, 'arquivos processados');
    } catch (error) {
      console.log('⚠️  Erro no processamento múltiplo:', error);
    }

    console.log('\n🎯 Resumo dos testes:');
    console.log('✅ Upload simples: OK');
    console.log('✅ Processamento manual: Testado');
    console.log('✅ Upload e processamento automático: OK');
    console.log('✅ Verificação de status: OK');
    console.log('✅ Processamento múltiplo: Testado');

    console.log('\n📋 Estrutura final do payload:');
    const examplePayload = {
      data: {
        agentId: "23448",
        thread: "thread_test",
        assistantId: "seia-master",
        assistantName: "SEIA-MASTER",
        messages: [{ role: "user", content: "Dados coletados" }],
        wait_execution: false,
        timestamp: new Date().toISOString()
      },
      form: {
        nomeempresa: "Cerrado Engenharia",
        nomeprojeto: "Teste de Processamento",
        localizacao: "Ituiutaba - MG",
        tipoestudo: "EIA/RIMA",
        termoreferencia: autoResult.file.filename,
        messages: [{ role: "user", content: "Dados coletados" }],
        file_ids: [autoResult.file.id],
        wait_execution: false
      }
    };

    console.log(JSON.stringify(examplePayload, null, 2));

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }

  console.log('\n🏁 Teste de processamento concluído!');
}

// Executar o teste
testFileProcessing().catch(console.error); 