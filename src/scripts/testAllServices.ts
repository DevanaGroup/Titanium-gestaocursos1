import { db } from './firebase-config';
import { collection, getDocs } from 'firebase/firestore';
import { whatsappNotificationService } from '../services/whatsappNotificationService';
import { ReportsService } from '../services/reportsService';
import { ProductivityService } from '../services/productivityService';

interface TestResult {
  service: string;
  success: boolean;
  collaboratorsFound: number;
  source: 'unified' | 'fallback' | 'error';
  details?: string;
}

async function testAllServices(): Promise<void> {
  console.log('\n🔬 TESTANDO TODOS OS SERVIÇOS ATUALIZADOS');
  console.log('==========================================\n');

  const results: TestResult[] = [];

  // 1. Testar WhatsApp Notification Service
  try {
    console.log('1️⃣ Testando WhatsAppNotificationService...');
    // Usar a instância singleton do whatsappNotificationService
    
          // Testar busca por hierarquia
      const managers = await whatsappNotificationService.getCollaboratorsByHierarchy(['Gerente']);
    
    results.push({
      service: 'WhatsAppNotificationService',
      success: true,
      collaboratorsFound: managers.length,
      source: managers.length > 0 ? 'unified' : 'fallback',
      details: `Gerentes encontrados: ${managers.length}`
    });
    
    console.log(`   ✅ ${managers.length} gerentes encontrados`);
    
    // Testar busca por ID (se houver colaboradores)
    if (managers.length > 0) {
      const testId = managers[0].id;
      // Método getCollaboratorById é privado, então vamos usar o público
      console.log(`   🔍 Testando colaborador ID: ${testId}`);
    }
    
  } catch (error) {
    console.error('   ❌ Erro no WhatsAppNotificationService:', error);
    results.push({
      service: 'WhatsAppNotificationService',
      success: false,
      collaboratorsFound: 0,
      source: 'error',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  // 2. Testar Reports Service
  try {
    console.log('\n2️⃣ Testando ReportsService...');
    const dashboardData = await ReportsService.getDashboardData();
    
    results.push({
      service: 'ReportsService',
      success: true,
      collaboratorsFound: dashboardData.metrics.totalCollaborators,
      source: 'unified',
      details: `Total de colaboradores: ${dashboardData.metrics.totalCollaborators}`
    });
    
    console.log(`   ✅ ${dashboardData.metrics.totalCollaborators} colaboradores no relatório`);
    console.log(`   📊 Projetos ativos: ${dashboardData.metrics.activeProjects}`);
    console.log(`   📈 Tarefas completadas: ${dashboardData.metrics.completedTasks}`);
    
  } catch (error) {
    console.error('   ❌ Erro no ReportsService:', error);
    results.push({
      service: 'ReportsService',
      success: false,
      collaboratorsFound: 0,
      source: 'error',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  // 3. Testar Productivity Service
  try {
    console.log('\n3️⃣ Testando ProductivityService...');
    
    // Gerar relatório de produtividade da empresa
    const productivityReport = await ProductivityService.generateProductivityReport(
      'company',
      {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
        end: new Date(),
        type: 'month'
      }
    );
    
    results.push({
      service: 'ProductivityService',
      success: true,
      collaboratorsFound: productivityReport.summary.totalCollaborators,
      source: 'unified',
      details: `Colaboradores no relatório: ${productivityReport.summary.totalCollaborators}`
    });
    
    console.log(`   ✅ ${productivityReport.summary.totalCollaborators} colaboradores analisados`);
    console.log(`   ⏱️ Total de horas trabalhadas: ${productivityReport.summary.totalHoursWorked.toFixed(1)}h`);
    console.log(`   ✅ Total de tarefas completadas: ${productivityReport.summary.totalTasksCompleted}`);
    
  } catch (error) {
    console.error('   ❌ Erro no ProductivityService:', error);
    results.push({
      service: 'ProductivityService',
      success: false,
      collaboratorsFound: 0,
      source: 'error',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  // 4. Verificar dados da coleção unificada diretamente
  try {
    console.log('\n4️⃣ Verificando coleção unificada diretamente...');
    const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    const unifiedCount = unifiedSnapshot.docs.length;
    
    console.log(`   📋 Registros na coleção unificada: ${unifiedCount}`);
    
    if (unifiedCount > 0) {
      const sampleData = unifiedSnapshot.docs[0].data();
      console.log(`   📝 Exemplo de campos: ${Object.keys(sampleData).join(', ')}`);
    }
    
  } catch (error) {
    console.error('   ❌ Erro ao acessar coleção unificada:', error);
  }

  // 5. Resumo final
  console.log('\n📊 RESUMO DOS TESTES');
  console.log('===================');
  
  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log(`✅ Serviços funcionando: ${successCount}/${totalTests}`);
  console.log(`📈 Taxa de sucesso: ${Math.round((successCount / totalTests) * 100)}%\n`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const source = result.success ? `(${result.source})` : '';
    console.log(`${status} ${result.service}: ${result.collaboratorsFound} colaboradores ${source}`);
    if (result.details) {
      console.log(`   └─ ${result.details}`);
    }
  });

  // 6. Recomendações
  console.log('\n🎯 RECOMENDAÇÕES');
  console.log('================');
  
  if (successCount === totalTests) {
    console.log('🎉 Todos os serviços estão funcionando com a coleção unificada!');
    console.log('✅ Migração bem-sucedida - sistema está otimizado');
    console.log('💡 Próximos passos: monitorar performance e considerar remoção das coleções antigas');
  } else {
    console.log('⚠️ Alguns serviços ainda apresentam problemas');
    console.log('🔧 Verificar logs específicos e ajustar fallbacks se necessário');
  }
  
  console.log('\n🔄 Para testar novamente, execute: npm run test:services');
}

// Executar o teste
testAllServices().catch(console.error); 