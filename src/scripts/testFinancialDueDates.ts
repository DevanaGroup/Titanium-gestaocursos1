import { getAllFinancialDues, updateFinancialDueStatus } from '../services/financialDueDatesService';

/**
 * Script de teste para verificar se as funções de atualização de vencimentos estão funcionando
 */
export const testFinancialDueDates = async () => {
  try {
    console.log("🧪 [testFinancialDueDates] Iniciando teste de vencimentos financeiros...");
    
    // 1. Buscar todos os vencimentos
    console.log("📋 [testFinancialDueDates] Buscando vencimentos...");
    const allDues = await getAllFinancialDues();
    console.log(`📊 [testFinancialDueDates] Encontrados ${allDues.length} vencimentos`);
    
    if (allDues.length === 0) {
      console.log("⚠️ [testFinancialDueDates] Nenhum vencimento encontrado para teste");
      return;
    }
    
    // 2. Mostrar detalhes dos primeiros vencimentos
    console.log("📋 [testFinancialDueDates] Detalhes dos primeiros vencimentos:");
    allDues.slice(0, 3).forEach((due, index) => {
      console.log(`  ${index + 1}. ID: ${due.id}`);
      console.log(`     Tipo: ${due.type}`);
      console.log(`     Descrição: ${due.description}`);
      console.log(`     Valor: R$ ${due.amount.toFixed(2)}`);
      console.log(`     Status: ${due.status}`);
      console.log(`     Fonte: ${due.source}`);
      console.log(`     Vencimento: ${due.dueDate.toLocaleDateString('pt-BR')}`);
      console.log("");
    });
    
    // 3. Testar atualização de um vencimento
    const testDue = allDues.find(due => due.status === 'PENDING' || due.status === 'OVERDUE');
    
    if (!testDue) {
      console.log("⚠️ [testFinancialDueDates] Nenhum vencimento pendente encontrado para teste");
      return;
    }
    
    console.log(`🧪 [testFinancialDueDates] Testando atualização do vencimento: ${testDue.id}`);
    console.log(`📋 [testFinancialDueDates] Status atual: ${testDue.status}`);
    
    // 4. Marcar como pago/recebido
    const newStatus = testDue.type === 'RECEIVABLE' ? 'RECEIVED' : 'PAID';
    console.log(`🔄 [testFinancialDueDates] Marcando como: ${newStatus}`);
    
    await updateFinancialDueStatus(testDue.id, newStatus, {
      paymentDate: new Date(),
      paymentAmount: testDue.amount,
      paymentMethod: 'Teste',
      observations: 'Teste de atualização via script'
    });
    
    console.log(`✅ [testFinancialDueDates] Vencimento ${testDue.id} atualizado com sucesso!`);
    
    // 5. Verificar se a atualização foi persistida
    console.log("🔄 [testFinancialDueDates] Verificando se a atualização foi persistida...");
    const updatedDues = await getAllFinancialDues();
    const updatedDue = updatedDues.find(due => due.id === testDue.id);
    
    if (updatedDue) {
      console.log(`📋 [testFinancialDueDates] Status após atualização: ${updatedDue.status}`);
      console.log(`📋 [testFinancialDueDates] Data de pagamento: ${updatedDue.paymentDate?.toLocaleDateString('pt-BR') || 'N/A'}`);
      console.log(`📋 [testFinancialDueDates] Valor pago: R$ ${updatedDue.paymentAmount?.toFixed(2) || 'N/A'}`);
      console.log(`📋 [testFinancialDueDates] Método: ${updatedDue.paymentMethod || 'N/A'}`);
      console.log(`📋 [testFinancialDueDates] Observações: ${updatedDue.observations || 'N/A'}`);
      
      if (updatedDue.status === newStatus) {
        console.log("✅ [testFinancialDueDates] TESTE PASSOU! Atualização foi persistida corretamente.");
      } else {
        console.log("❌ [testFinancialDueDates] TESTE FALHOU! Status não foi atualizado corretamente.");
      }
    } else {
      console.log("❌ [testFinancialDueDates] TESTE FALHOU! Vencimento não foi encontrado após atualização.");
    }
    
    // 6. Testar marcar como pendente novamente
    console.log("🔄 [testFinancialDueDates] Testando marcar como pendente...");
    await updateFinancialDueStatus(testDue.id, 'PENDING', {
      paymentDate: undefined,
      paymentAmount: undefined,
      paymentMethod: undefined,
      observations: 'Teste de retorno para pendente'
    });
    
    console.log("✅ [testFinancialDueDates] Vencimento marcado como pendente novamente!");
    
    // 7. Verificação final
    const finalDues = await getAllFinancialDues();
    const finalDue = finalDues.find(due => due.id === testDue.id);
    
    if (finalDue && finalDue.status === 'PENDING') {
      console.log("✅ [testFinancialDueDates] TESTE FINAL PASSOU! Vencimento retornou para pendente corretamente.");
    } else {
      console.log("❌ [testFinancialDueDates] TESTE FINAL FALHOU! Vencimento não retornou para pendente.");
    }
    
    console.log("🎉 [testFinancialDueDates] Teste concluído!");
    
  } catch (error) {
    console.error("❌ [testFinancialDueDates] Erro durante o teste:", error);
  }
};

// Executar o teste
testFinancialDueDates(); 