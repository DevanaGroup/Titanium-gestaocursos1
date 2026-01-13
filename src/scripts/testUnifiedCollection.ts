import { db } from '../config/firebase-node';
import { collection, getDocs } from 'firebase/firestore';

const testUnifiedCollection = async () => {
  try {
    console.log('🧪 Testando coleção unificada...\n');
    
    // 1. Verificar coleção unificada
    console.log('📋 1. Verificando coleção "collaborators_unified":');
    const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    console.log(`   📄 Documentos encontrados: ${unifiedSnapshot.size}`);
    
    if (unifiedSnapshot.size > 0) {
      console.log('\n   👥 Primeiros 5 colaboradores:');
      unifiedSnapshot.docs.slice(0, 5).forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. ${data.firstName} ${data.lastName} (${data.email}) - ${data.hierarchyLevel}`);
        console.log(`      Fontes: Users=${data.sourceCollections?.hadUsersData}, Collaborators=${data.sourceCollections?.hadCollaboratorsData}`);
      });
    }
    
    // 2. Verificar coleções antigas
    console.log('\n📋 2. Verificando coleções antigas para comparação:');
    
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`   📄 Coleção "users": ${usersSnapshot.size} documentos`);
    
    const collaboratorsSnapshot = await getDocs(collection(db, 'collaborators'));
    console.log(`   📄 Coleção "collaborators": ${collaboratorsSnapshot.size} documentos`);
    
    // 3. Análise dos dados
    console.log('\n📊 3. Análise dos dados:');
    
    const totalOld = usersSnapshot.size + collaboratorsSnapshot.size;
    const uniqueOld = new Set([
      ...usersSnapshot.docs.map(doc => doc.id),
      ...collaboratorsSnapshot.docs.map(doc => doc.id)
    ]).size;
    
    console.log(`   📈 Total antigo (com possíveis duplicatas): ${totalOld}`);
    console.log(`   🔄 UIDs únicos nas coleções antigas: ${uniqueOld}`);
    console.log(`   ✨ Total na coleção unificada: ${unifiedSnapshot.size}`);
    
    if (unifiedSnapshot.size === uniqueOld) {
      console.log('   ✅ Migração parece correta! Todos os UIDs únicos foram migrados.');
    } else if (unifiedSnapshot.size > uniqueOld) {
      console.log('   ⚠️ Coleção unificada tem mais registros que o esperado.');
    } else {
      console.log('   ❌ Alguns registros podem não ter sido migrados.');
    }
    
    // 4. Verificar estrutura dos dados
    console.log('\n🔍 4. Verificando estrutura dos dados:');
    if (unifiedSnapshot.size > 0) {
      const sampleDoc = unifiedSnapshot.docs[0];
      const data = sampleDoc.data();
      const fields = Object.keys(data);
      
      console.log(`   📝 Campos disponíveis (${fields.length}):`);
      console.log(`   ${fields.join(', ')}`);
      
      const essentialFields = ['uid', 'firstName', 'lastName', 'email', 'hierarchyLevel'];
      const missingFields = essentialFields.filter(field => !fields.includes(field));
      
      if (missingFields.length === 0) {
        console.log('   ✅ Todos os campos essenciais estão presentes.');
      } else {
        console.log(`   ❌ Campos essenciais faltando: ${missingFields.join(', ')}`);
      }
    }
    
    // 5. Resultado final
    console.log('\n🎯 Resultado do teste:');
    if (unifiedSnapshot.size >= uniqueOld && unifiedSnapshot.size > 0) {
      console.log('✅ SUCESSO: Coleção unificada está funcionando corretamente!');
      console.log('📝 Próximos passos sugeridos:');
      console.log('   1. Testar funcionalidades no sistema web');
      console.log('   2. Verificar se todos os colaboradores aparecem nos selects');
      console.log('   3. Após confirmação, considerar remover coleções antigas');
    } else {
      console.log('❌ PROBLEMA: Coleção unificada pode estar incompleta.');
      console.log('💡 Sugestões:');
      console.log('   1. Execute novamente o script de migração');
      console.log('   2. Verifique se houve erros durante a migração');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
};

// Executar o teste
testUnifiedCollection().then(() => {
  console.log('\n✨ Teste finalizado!');
}).catch((error) => {
  console.error('💥 Erro fatal no teste:', error);
}); 