// Exemplo completo: Sistema de Campos Dinâmicos + Processamento de Arquivos
console.log('🔥 Exemplo: Fluxo Completo de Upload e Processamento\n');

// Simulação de um formulário SEIA-MASTER preenchido
const formularioSEIA = {
  nomeempresa: "Cerrado Engenharia Ltda",
  nomeprojeto: "Parque Eólico Goiabal",
  localizacao: "Ituiutaba - MG, Coordenadas: -18.9706° S, -49.4555° W",
  tipoestudo: "EIA/RIMA - Estudo de Impacto Ambiental",
  termoreferencia: null, // Será preenchido após upload
  documentacaotecnica: null,
  planilhasdados: null,
  fotoscampo: null
};

// Simulação de arquivos reais
const arquivosExemplo = {
  termoReferencia: {
    name: "TR_SEMA_GO_2024_001.pdf",
    content: "Termo de referência para estudos ambientais...",
    type: "application/pdf",
    size: 2048000 // 2MB
  },
  documentacaoTecnica: {
    name: "Memorial_Descritivo_Projeto.pdf", 
    content: "Memorial descritivo do projeto...",
    type: "application/pdf",
    size: 5120000 // 5MB
  },
  planilhasDados: {
    name: "Monitoramento_Ambiental.xlsx",
    content: "Dados de monitoramento...",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 1024000 // 1MB
  },
  fotosCampo: {
    name: "Fotos_Levantamento_Campo.zip",
    content: "Arquivo com fotos do levantamento...",
    type: "application/zip", 
    size: 15360000 // 15MB
  }
};

// Simulação do fluxo completo
async function exemploFluxoCompleto() {
  console.log('📋 Dados do formulário:');
  console.log(JSON.stringify(formularioSEIA, null, 2));
  
  console.log('\n📁 Arquivos a serem processados:');
  Object.entries(arquivosExemplo).forEach(([key, file]) => {
    console.log(`• ${key}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  });

  // Simulação de IDs retornados pelo Tess Pareto após processamento
  const tessParetResults = {
    termoreferencia: { id: 389600, filename: "TR_SEMA_GO_2024_001.pdf", status: "completed" },
    documentacaotecnica: { id: 389601, filename: "Memorial_Descritivo_Projeto.pdf", status: "completed" },
    planilhasdados: { id: 389602, filename: "Monitoramento_Ambiental.xlsx", status: "completed" },
    fotoscampo: { id: 389603, filename: "Fotos_Levantamento_Campo.zip", status: "completed" }
  };

  console.log('\n✅ Resultados do processamento Tess Pareto:');
  Object.entries(tessParetResults).forEach(([key, result]) => {
    console.log(`• ${key}: ID ${result.id}, Status: ${result.status}`);
  });

  // Formulário atualizado com nomes dos arquivos
  const formularioAtualizado = {
    ...formularioSEIA,
    termoreferencia: tessParetResults.termoreferencia.filename,
    documentacaotecnica: tessParetResults.documentacaotecnica.filename,
    planilhasdados: tessParetResults.planilhasdados.filename,
    fotoscampo: tessParetResults.fotoscampo.filename
  };

  // Array de file_ids
  const fileIds = Object.values(tessParetResults).map(result => result.id);

  // Mensagens para a IA
  const messages = [
    {
      role: "user",
      content: `Dados coletados para elaboração de ${formularioAtualizado.tipoestudo}. Empresa: ${formularioAtualizado.nomeempresa}, Projeto: ${formularioAtualizado.nomeprojeto}, Localização: ${formularioAtualizado.localizacao}. Arquivos processados: ${fileIds.length} documentos.`
    }
  ];

  // Payload final para webhook
  const payloadFinal = {
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
      ...formularioAtualizado,
      messages: messages,
      file_ids: fileIds,
      wait_execution: false
    }
  };

  console.log('\n🚀 Payload final para webhook:');
  console.log(JSON.stringify(payloadFinal, null, 2));

  console.log('\n📊 Estatísticas:');
  console.log(`• Total de campos: ${Object.keys(payloadFinal.form).length}`);
  console.log(`• Arquivos processados: ${fileIds.length}`);
  console.log(`• Tamanho total estimado: ${Object.values(arquivosExemplo).reduce((total, file) => total + file.size, 0) / 1024 / 1024} MB`);
  console.log(`• Tamanho do payload: ${JSON.stringify(payloadFinal).length} bytes`);

  console.log('\n🎯 Benefícios do processamento:');
  console.log('✅ Arquivos convertidos para IDs (payload menor)');
  console.log('✅ IA pode acessar conteúdo real dos documentos');
  console.log('✅ Processamento automático sem intervenção manual');
  console.log('✅ Fallback para base64 se necessário');
  console.log('✅ Estrutura data + form mantida');

  console.log('\n💡 Fluxo na interface:');
  console.log('1. Usuário preenche formulário SEIA-MASTER');
  console.log('2. Sistema faz upload dos arquivos para Tess Pareto');
  console.log('3. Arquivos são processados automaticamente');
  console.log('4. IDs são extraídos e incluídos em file_ids');
  console.log('5. Payload é enviado para webhook n8n');
  console.log('6. IA recebe dados estruturados + acesso aos arquivos');

  return payloadFinal;
}

// Executar exemplo
exemploFluxoCompleto().then(payload => {
  console.log('\n🏁 Exemplo de fluxo completo finalizado!');
  console.log('Sistema pronto para estudos ambientais completos.');
}).catch(error => {
  console.error('❌ Erro no exemplo:', error);
});

export { exemploFluxoCompleto }; 