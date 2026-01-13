import { db } from './firebase-config';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface CleanupResult {
  collection: string;
  documentsFound: number;
  documentsDeleted: number;
  errors: string[];
  success: boolean;
}

async function cleanupOldCollections(): Promise<void> {
  console.log('\n🧹 LIMPEZA DAS COLEÇÕES ANTIGAS');
  console.log('===============================\n');

  const results: CleanupResult[] = [];

  // 1. Verificar se a coleção unificada está funcionando
  console.log('1️⃣ Verificando coleção unificada...');
  try {
    const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    const unifiedCount = unifiedSnapshot.docs.length;
    
    console.log(`   ✅ Coleção unificada: ${unifiedCount} documentos`);
    
    if (unifiedCount === 0) {
      console.log('   ❌ ERRO: Coleção unificada está vazia!');
      console.log('   🛑 ABORTANDO limpeza por segurança');
      return;
    }
    
    if (unifiedCount < 10) {
      console.log('   ⚠️ WARNING: Poucos documentos na coleção unificada');
      console.log('   🤔 Tem certeza que a migração foi completa?');
      console.log('   ⏸️ Recomendo verificar antes de continuar');
      return;
    }
    
    console.log('   ✅ Coleção unificada parece estar OK!\n');
    
  } catch (error) {
    console.error('   ❌ ERRO ao acessar coleção unificada:', error);
    console.log('   🛑 ABORTANDO limpeza por segurança');
    return;
  }

  // 2. Cleanup da coleção 'users'
  console.log('2️⃣ Limpando coleção "users"...');
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersCount = usersSnapshot.docs.length;
    
    console.log(`   📋 Encontrados ${usersCount} documentos para remover`);
    
    let deletedCount = 0;
    const errors: string[] = [];
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        await deleteDoc(doc(db, 'users', userDoc.id));
        deletedCount++;
        console.log(`   🗑️ Removido: ${userDoc.id}`);
      } catch (error) {
        const errorMsg = `Erro ao remover ${userDoc.id}: ${error}`;
        errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
    
    results.push({
      collection: 'users',
      documentsFound: usersCount,
      documentsDeleted: deletedCount,
      errors,
      success: deletedCount === usersCount
    });
    
    console.log(`   ✅ Removidos ${deletedCount}/${usersCount} documentos\n`);
    
  } catch (error) {
    console.error('   ❌ Erro ao limpar coleção users:', error);
    results.push({
      collection: 'users',
      documentsFound: 0,
      documentsDeleted: 0,
      errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
      success: false
    });
  }

  // 3. Cleanup da coleção 'collaborators'
  console.log('3️⃣ Limpando coleção "collaborators"...');
  try {
    const collaboratorsSnapshot = await getDocs(collection(db, 'collaborators'));
    const collaboratorsCount = collaboratorsSnapshot.docs.length;
    
    console.log(`   📋 Encontrados ${collaboratorsCount} documentos para remover`);
    
    let deletedCount = 0;
    const errors: string[] = [];
    
    for (const collabDoc of collaboratorsSnapshot.docs) {
      try {
        await deleteDoc(doc(db, 'collaborators', collabDoc.id));
        deletedCount++;
        console.log(`   🗑️ Removido: ${collabDoc.id}`);
      } catch (error) {
        const errorMsg = `Erro ao remover ${collabDoc.id}: ${error}`;
        errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
    
    results.push({
      collection: 'collaborators',
      documentsFound: collaboratorsCount,
      documentsDeleted: deletedCount,
      errors,
      success: deletedCount === collaboratorsCount
    });
    
    console.log(`   ✅ Removidos ${deletedCount}/${collaboratorsCount} documentos\n`);
    
  } catch (error) {
    console.error('   ❌ Erro ao limpar coleção collaborators:', error);
    results.push({
      collection: 'collaborators',
      documentsFound: 0,
      documentsDeleted: 0,
      errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
      success: false
    });
  }

  // 4. Verificação final
  console.log('4️⃣ Verificação final...');
  try {
    const usersCheck = await getDocs(collection(db, 'users'));
    const collaboratorsCheck = await getDocs(collection(db, 'collaborators'));
    const unifiedCheck = await getDocs(collection(db, 'collaborators_unified'));
    
    console.log(`   📊 Restantes na 'users': ${usersCheck.docs.length}`);
    console.log(`   📊 Restantes na 'collaborators': ${collaboratorsCheck.docs.length}`);
    console.log(`   📊 Mantidos na 'collaborators_unified': ${unifiedCheck.docs.length}`);
    
  } catch (error) {
    console.error('   ❌ Erro na verificação final:', error);
  }

  // 5. Relatório final
  console.log('\n📊 RELATÓRIO FINAL DE LIMPEZA');
  console.log('=============================');
  
  const totalFound = results.reduce((sum, r) => sum + r.documentsFound, 0);
  const totalDeleted = results.reduce((sum, r) => sum + r.documentsDeleted, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  
  console.log(`📋 Total de documentos encontrados: ${totalFound}`);
  console.log(`🗑️ Total de documentos removidos: ${totalDeleted}`);
  console.log(`❌ Total de erros: ${totalErrors}`);
  console.log(`📈 Taxa de sucesso: ${Math.round((totalDeleted / totalFound) * 100)}%\n`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.collection}: ${result.documentsDeleted}/${result.documentsFound} removidos`);
    
    if (result.errors.length > 0) {
      console.log(`   ⚠️ Erros encontrados:`);
      result.errors.forEach(error => {
        console.log(`      - ${error}`);
      });
    }
  });

  if (totalDeleted === totalFound && totalErrors === 0) {
    console.log('\n🎉 LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('✅ Todas as coleções antigas foram removidas');
    console.log('✅ Sistema agora usa apenas a coleção unificada');
    console.log('✅ Performance e organização otimizadas');
    
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('1. Testar funcionamento do sistema');
    console.log('2. Monitorar logs por alguns dias');
    console.log('3. Remover código de fallback futuramente (opcional)');
    
  } else {
    console.log('\n⚠️ LIMPEZA PARCIAL OU COM PROBLEMAS');
    console.log('🔧 Verificar logs acima para identificar problemas');
    console.log('🛠️ Pode ser necessário reexecutar para documentos restantes');
  }
  
  console.log('\n🔄 Para executar novamente: npm run cleanup');
}

// Executar limpeza
console.log('🚨 ATENÇÃO: Este script irá REMOVER PERMANENTEMENTE as coleções "users" e "collaborators"');
console.log('🔒 Certificando-se que a coleção "collaborators_unified" está funcionando...');
console.log('⏱️ Iniciando em 3 segundos...\n');

setTimeout(() => {
  cleanupOldCollections().catch(console.error);
}, 3000); 