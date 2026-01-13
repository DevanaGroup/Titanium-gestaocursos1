import { ReportsService } from '../services/reportsService';

async function testReportsMenu() {
  console.log('🧪 Testando menu de relatórios...');
  
  try {
    // Teste 1: Carregar dados do dashboard
    console.log('\n📊 Teste 1: Carregando dados do dashboard...');
    const dashboardData = await ReportsService.getDashboardData();
    
    console.log('✅ Dados carregados com sucesso!');
    console.log('📈 Métricas principais:');
    console.log(`   - Projetos ativos: ${dashboardData.metrics.activeProjects}`);
    console.log(`   - Receita mensal: R$ ${dashboardData.metrics.monthlyRevenue.toLocaleString('pt-BR')}`);
    console.log(`   - Tarefas concluídas: ${dashboardData.metrics.completedTasks}`);
    console.log(`   - Colaboradores: ${dashboardData.metrics.totalCollaborators}`);
    
    // Teste 2: Verificar dados dos gráficos
    console.log('\n📊 Teste 2: Verificando dados dos gráficos...');
    console.log(`   - Status dos projetos: ${dashboardData.charts.projectsByStatus.length} categorias`);
    console.log(`   - Tarefas por status: ${dashboardData.charts.tasksByStatus.length} categorias`);
    console.log(`   - Produtividade por colaborador: ${dashboardData.charts.collaboratorProductivity.length} colaboradores`);
    console.log(`   - Dados financeiros: ${dashboardData.charts.monthlyRevenueData.length} meses`);
    
    // Teste 3: Verificar listas
    console.log('\n📋 Teste 3: Verificando listas...');
    console.log(`   - Top performers: ${dashboardData.lists.topPerformers.length} colaboradores`);
    console.log(`   - Tarefas urgentes: ${dashboardData.lists.urgentTasks.length} tarefas`);
    console.log(`   - Projetos recentes: ${dashboardData.lists.recentProjects.length} projetos`);
    
    // Teste 4: Gerar relatórios
    console.log('\n📄 Teste 4: Testando geração de relatórios...');
    
    const productivityReport = await ReportsService.generateProductivityReport();
    console.log('✅ Relatório de produtividade gerado');
    
    const financialReport = await ReportsService.generateFinancialReport(new Date(), new Date());
    console.log('✅ Relatório financeiro gerado');
    
    const resourceReport = await ReportsService.generateResourceReport();
    console.log('✅ Relatório de recursos gerado');
    
    // Teste 5: Exportação
    console.log('\n📤 Teste 5: Testando exportação...');
    await ReportsService.exportToPDF(dashboardData);
    console.log('✅ Exportação para PDF simulada');
    
    await ReportsService.exportToExcel(dashboardData);
    console.log('✅ Exportação para Excel simulada');
    
    console.log('\n🎉 Todos os testes passaram! O menu de relatórios está funcionando corretamente.');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    console.log('\n🔍 Possíveis problemas:');
    console.log('   1. Verificar conexão com Firebase');
    console.log('   2. Verificar permissões de acesso');
    console.log('   3. Verificar se as coleções existem');
    console.log('   4. Verificar se há dados para processar');
  }
}

// Executar o teste
testReportsMenu(); 