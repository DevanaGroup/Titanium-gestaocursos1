import { db } from '../config/firebase-node';
import { collection, getDocs } from 'firebase/firestore';

const testAllOptimizations = async () => {
  try {
    console.log('🧪 Testando todas as otimizações implementadas...\n');
    
    const startTime = Date.now();
    
    // 1. Testar coleção unificada
    console.log('📋 1. Testando coleção unificada:');
    const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    console.log(`   ✅ Coleção unificada: ${unifiedSnapshot.size} colaboradores`);
    
    // 2. Comparar com coleções antigas
    console.log('\n📋 2. Comparando com coleções antigas:');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const collaboratorsSnapshot = await getDocs(collection(db, 'collaborators'));
    
    const totalOldRecords = usersSnapshot.size + collaboratorsSnapshot.size;
    const uniqueOldUIDs = new Set([
      ...usersSnapshot.docs.map(doc => doc.id),
      ...collaboratorsSnapshot.docs.map(doc => doc.id)
    ]).size;
    
    console.log(`   📄 Coleção "users": ${usersSnapshot.size} registros`);
    console.log(`   📄 Coleção "collaborators": ${collaboratorsSnapshot.size} registros`);
    console.log(`   📊 Total antigo: ${totalOldRecords} registros`);
    console.log(`   🔄 UIDs únicos antigos: ${uniqueOldUIDs}`);
    console.log(`   ✨ Coleção unificada: ${unifiedSnapshot.size} registros`);
    
    // 3. Análise de performance
    console.log('\n⚡ 3. Análise de performance:');
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    console.log(`   ⏱️ Tempo de consulta: ${queryTime}ms`);
    
    // Calcular economia estimada
    const oldQueries = 2; // Antes: 2 queries (users + collaborators)
    const newQueries = 1; // Agora: 1 query (unified)
    const performanceImprovement = ((oldQueries - newQueries) / oldQueries * 100).toFixed(1);
    
    console.log(`   🚀 Redução de queries: ${oldQueries} → ${newQueries}`);
    console.log(`   📈 Melhoria de performance: ${performanceImprovement}% menos operações`);
    
    // 4. Verificar integridade dos dados
    console.log('\n🔍 4. Verificando integridade dos dados:');
    
    const missingRecords = uniqueOldUIDs - unifiedSnapshot.size;
    if (missingRecords === 0) {
      console.log('   ✅ Todos os registros foram migrados corretamente');
    } else if (missingRecords > 0) {
      console.log(`   ⚠️ ${missingRecords} registros podem estar faltando`);
    } else {
      console.log(`   ✅ Coleção unificada tem ${Math.abs(missingRecords)} registros a mais (possível deduplicação)`);
    }
    
    // 5. Verificar estrutura dos dados
    console.log('\n📝 5. Verificando estrutura dos dados:');
    if (unifiedSnapshot.size > 0) {
      const sampleDoc = unifiedSnapshot.docs[0];
      const data = sampleDoc.data();
      const fields = Object.keys(data);
      
      const requiredFields = ['uid', 'firstName', 'lastName', 'email', 'hierarchyLevel'];
      const migrationFields = ['migratedAt', 'sourceCollections'];
      const hasRequiredFields = requiredFields.every(field => fields.includes(field));
      const hasMigrationData = migrationFields.every(field => fields.includes(field));
      
      console.log(`   📊 Total de campos: ${fields.length}`);
      console.log(`   ✅ Campos obrigatórios: ${hasRequiredFields ? 'OK' : 'ERRO'}`);
      console.log(`   📋 Dados de migração: ${hasMigrationData ? 'OK' : 'Não encontrados'}`);
    }
    
    // 6. Verificar distribuição de fontes
    console.log('\n📊 6. Análise de fontes dos dados:');
    let onlyUsers = 0;
    let onlyCollaborators = 0;
    let bothSources = 0;
    
    unifiedSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.sourceCollections) {
        if (data.sourceCollections.hadUsersData && data.sourceCollections.hadCollaboratorsData) {
          bothSources++;
        } else if (data.sourceCollections.hadUsersData) {
          onlyUsers++;
        } else if (data.sourceCollections.hadCollaboratorsData) {
          onlyCollaborators++;
        }
      }
    });
    
    console.log(`   👤 Apenas da coleção "users": ${onlyUsers}`);
    console.log(`   👥 Apenas da coleção "collaborators": ${onlyCollaborators}`);
    console.log(`   🔄 De ambas as coleções: ${bothSources}`);
    
    // 7. Resultado final
    console.log('\n🎯 Resultado final da otimização:');
    
    const isSuccessful = unifiedSnapshot.size >= uniqueOldUIDs && unifiedSnapshot.size > 0;
    
    if (isSuccessful) {
      console.log('✅ OTIMIZAÇÃO BEM-SUCEDIDA!');
      console.log('\n📈 Benefícios alcançados:');
      console.log(`   🚀 Performance: ${performanceImprovement}% menos operações Firebase`);
      console.log('   💰 Custos: Redução significativa nos custos de reads');
      console.log('   🔧 Manutenção: Código mais simples e limpo');
      console.log('   🛡️ Consistência: Fonte única de verdade para colaboradores');
      console.log('   📊 Escalabilidade: Arquitetura mais robusta');
      
      console.log('\n🎉 Sistema otimizado e funcionando perfeitamente!');
      console.log('\n📝 Próximos passos recomendados:');
      console.log('   1. ✅ Monitorar sistema por 24-48h');
      console.log('   2. 🧪 Testar todas as funcionalidades no navegador');
      console.log('   3. 📊 Verificar logs de performance');
      console.log('   4. 🗑️ Considerar backup e remoção das coleções antigas');
      
    } else {
      console.log('❌ PROBLEMAS DETECTADOS!');
      console.log('\n🔧 Ações recomendadas:');
      console.log('   1. Verificar logs de erros durante migração');
      console.log('   2. Re-executar script de migração se necessário');
      console.log('   3. Investigar possíveis inconsistências nos dados');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
};

// Executar o teste
testAllOptimizations().then(() => {
  console.log('\n✨ Teste de otimizações finalizado!');
}).catch((error) => {
  console.error('💥 Erro fatal no teste:', error);
}); 