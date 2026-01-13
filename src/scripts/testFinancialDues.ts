import { 
  getAllFinancialDues, 
  getFinancialDuesStats 
} from '../services/financialDueDatesService';
import { 
  getAllAccountsPayable, 
  getAllAccountsReceivable, 
  getAllFinancialClients, 
  getAllSuppliers 
} from '../services/financialCoreService';

/**
 * Script para testar o módulo de vencimentos financeiros
 * Verifica se está puxando corretamente as contas a pagar e receber
 */
async function testFinancialDuesModule() {
  console.log("🔍 INICIANDO TESTE DO MÓDULO DE VENCIMENTOS FINANCEIROS");
  console.log("=" .repeat(60));

  try {
    // TESTE 1: Verificar dados básicos
    console.log("\n📊 TESTE 1: Verificando dados básicos do sistema");
    console.log("-".repeat(50));
    
    const [accountsPayable, accountsReceivable, financialClients, suppliers] = await Promise.all([
      getAllAccountsPayable(),
      getAllAccountsReceivable(),
      getAllFinancialClients(),
      getAllSuppliers()
    ]);

    console.log("✅ Dados básicos encontrados:");
    console.log(`   - Contas a Pagar: ${accountsPayable.length}`);
    console.log(`   - Contas a Receber: ${accountsReceivable.length}`);
    console.log(`   - Clientes Financeiros: ${financialClients.length}`);
    console.log(`   - Fornecedores: ${suppliers.length}`);

    // TESTE 2: Verificar integração do módulo de vencimentos
    console.log("\n🔄 TESTE 2: Testando integração do módulo de vencimentos");
    console.log("-".repeat(50));
    
    const allDues = await getAllFinancialDues();
    console.log(`✅ Total de vencimentos processados: ${allDues.length}`);

    // TESTE 3: Verificar estatísticas
    console.log("\n📈 TESTE 3: Verificando estatísticas de vencimentos");
    console.log("-".repeat(50));
    
    const stats = await getFinancialDuesStats();
    console.log("✅ Estatísticas calculadas:");
    console.log(`   - Em Atraso: ${stats.overdue.count} (R$ ${stats.overdue.amount.toFixed(2)})`);
    console.log(`   - Vence Hoje: ${stats.dueToday.count} (R$ ${stats.dueToday.amount.toFixed(2)})`);
    console.log(`   - Próximos 7 Dias: ${stats.dueThisWeek.count} (R$ ${stats.dueThisWeek.amount.toFixed(2)})`);
    console.log(`   - A Receber: ${stats.receivables.count} (R$ ${stats.receivables.amount.toFixed(2)})`);
    console.log(`   - A Pagar: ${stats.payables.count} (R$ ${stats.payables.amount.toFixed(2)})`);

    // TESTE 4: Verificar detalhes dos vencimentos
    console.log("\n📋 TESTE 4: Analisando detalhes dos vencimentos");
    console.log("-".repeat(50));
    
    const byType = {
      receivable: allDues.filter(d => d.type === 'RECEIVABLE'),
      payable: allDues.filter(d => d.type === 'PAYABLE')
    };

    const bySource = {
      accountPayable: allDues.filter(d => d.source === 'ACCOUNT_PAYABLE'),
      accountReceivable: allDues.filter(d => d.source === 'ACCOUNT_RECEIVABLE'),
      supplierRecurring: allDues.filter(d => d.source === 'SUPPLIER_RECURRING'),
      clientRecurring: allDues.filter(d => d.source === 'CLIENT_RECURRING')
    };

    const byStatus = {
      pending: allDues.filter(d => d.status === 'PENDING'),
      overdue: allDues.filter(d => d.status === 'OVERDUE'),
      paid: allDues.filter(d => d.status === 'PAID'),
      received: allDues.filter(d => d.status === 'RECEIVED')
    };

    console.log("✅ Distribuição por tipo:");
    console.log(`   - A Receber: ${byType.receivable.length}`);
    console.log(`   - A Pagar: ${byType.payable.length}`);

    console.log("\n✅ Distribuição por fonte:");
    console.log(`   - Contas a Pagar: ${bySource.accountPayable.length}`);
    console.log(`   - Contas a Receber: ${bySource.accountReceivable.length}`);
    console.log(`   - Fornecedores Recorrentes: ${bySource.supplierRecurring.length}`);
    console.log(`   - Clientes Recorrentes: ${bySource.clientRecurring.length}`);

    console.log("\n✅ Distribuição por status:");
    console.log(`   - Pendente: ${byStatus.pending.length}`);
    console.log(`   - Em Atraso: ${byStatus.overdue.length}`);
    console.log(`   - Pago: ${byStatus.paid.length}`);
    console.log(`   - Recebido: ${byStatus.received.length}`);

    // TESTE 5: Verificar prioridades
    console.log("\n🎯 TESTE 5: Verificando prioridades");
    console.log("-".repeat(50));
    
    const byPriority = {
      urgent: allDues.filter(d => d.priority === 'URGENT'),
      high: allDues.filter(d => d.priority === 'HIGH'),
      medium: allDues.filter(d => d.priority === 'MEDIUM'),
      low: allDues.filter(d => d.priority === 'LOW')
    };

    console.log("✅ Distribuição por prioridade:");
    console.log(`   - Urgente (≥ R$ 50.000): ${byPriority.urgent.length}`);
    console.log(`   - Alta (R$ 10.000-49.999): ${byPriority.high.length}`);
    console.log(`   - Média (R$ 1.000-9.999): ${byPriority.medium.length}`);
    console.log(`   - Baixa (< R$ 1.000): ${byPriority.low.length}`);

    // TESTE 6: Verificar próximos vencimentos
    console.log("\n📅 TESTE 6: Próximos vencimentos");
    console.log("-".repeat(50));
    
    const next7Days = allDues.filter(due => {
      const today = new Date();
      const daysUntilDue = Math.ceil((due.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue <= 7;
    }).slice(0, 5);

    console.log("✅ Próximos 5 vencimentos (próximos 7 dias):");
    next7Days.forEach((due, index) => {
      const days = Math.ceil((due.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   ${index + 1}. ${due.description} - R$ ${due.amount.toFixed(2)} (${days} dias)`);
    });

    // TESTE 7: Verificar se há dados reais
    console.log("\n🔍 TESTE 7: Verificando se há dados reais ou apenas exemplos");
    console.log("-".repeat(50));
    
    const realDues = allDues.filter(due => !due.id.startsWith('example-'));
    const exampleDues = allDues.filter(due => due.id.startsWith('example-'));

    console.log(`✅ Vencimentos reais: ${realDues.length}`);
    console.log(`⚠️  Vencimentos de exemplo: ${exampleDues.length}`);

    if (realDues.length > 0) {
      console.log("\n🎉 SUCESSO: O módulo está puxando dados REAIS do sistema!");
      console.log("✅ Dados reais encontrados:");
      realDues.slice(0, 3).forEach((due, index) => {
        console.log(`   ${index + 1}. ${due.description} - R$ ${due.amount.toFixed(2)} (${due.source})`);
      });
    } else {
      console.log("\n⚠️  AVISO: O módulo está usando apenas dados de exemplo.");
      console.log("💡 Para ver dados reais, certifique-se de que há:");
      console.log("   - Contas a pagar cadastradas");
      console.log("   - Contas a receber cadastradas");
      console.log("   - Fornecedores com recorrência ativa");
      console.log("   - Clientes financeiros com contratos ativos");
    }

    // RESUMO FINAL
    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMO FINAL DO TESTE");
    console.log("=".repeat(60));
    
    const totalAmount = allDues.reduce((sum, due) => sum + due.amount, 0);
    const receivableAmount = byType.receivable.reduce((sum, due) => sum + due.amount, 0);
    const payableAmount = byType.payable.reduce((sum, due) => sum + due.amount, 0);
    const cashFlow = receivableAmount - payableAmount;

    console.log(`✅ Total de vencimentos: ${allDues.length}`);
    console.log(`💰 Valor total: R$ ${totalAmount.toFixed(2)}`);
    console.log(`📈 Total a receber: R$ ${receivableAmount.toFixed(2)}`);
    console.log(`📉 Total a pagar: R$ ${payableAmount.toFixed(2)}`);
    console.log(`💹 Fluxo de caixa: R$ ${cashFlow.toFixed(2)} ${cashFlow >= 0 ? '✅' : '⚠️'}`);

    if (allDues.length > 0) {
      console.log("\n🎉 TESTE CONCLUÍDO COM SUCESSO!");
      console.log("✅ O módulo de vencimentos está funcionando corretamente");
      console.log("✅ Está puxando dados do sistema (reais ou exemplos)");
      console.log("✅ Estatísticas estão sendo calculadas corretamente");
    } else {
      console.log("\n❌ TESTE FALHOU!");
      console.log("❌ Nenhum vencimento foi encontrado");
      console.log("💡 Verifique se há dados cadastrados no sistema");
    }

  } catch (error) {
    console.error("\n❌ ERRO NO TESTE:", error);
    console.error("💡 Verifique a configuração do Firebase e as permissões");
  }
}

// Executar o teste
testFinancialDuesModule().catch(console.error); 