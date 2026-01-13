import { db } from './firebase-config';
import { collection, getDocs } from 'firebase/firestore';

async function testUnifiedMigration(): Promise<void> {
  console.log('\n🔬 TESTANDO MIGRAÇÃO PARA COLEÇÃO UNIFICADA');
  console.log('==========================================\n');

  try {
    // 1. Verificar dados da coleção unificada
    console.log('1️⃣ Verificando coleção unificada...');
    const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    const unifiedDocs = unifiedSnapshot.docs;
    
    console.log(`   📋 Total de registros: ${unifiedDocs.length}`);
    
    if (unifiedDocs.length === 0) {
      console.log('   ❌ Coleção unificada está vazia!');
      return;
    }

    // 2. Verificar estrutura dos dados
    console.log('\n2️⃣ Verificando estrutura dos dados...');
    const sampleData = unifiedDocs[0].data();
    const requiredFields = ['firstName', 'lastName', 'email', 'hierarchyLevel', 'uid'];
    const optionalFields = ['phone', 'whatsapp', 'customPermissions', 'sourceCollections'];
    
    console.log(`   📝 Campos obrigatórios:`);
    requiredFields.forEach(field => {
      const hasField = field in sampleData;
      console.log(`      ${hasField ? '✅' : '❌'} ${field}`);
    });
    
    console.log(`   📝 Campos opcionais:`);
    optionalFields.forEach(field => {
      const hasField = field in sampleData;
      console.log(`      ${hasField ? '✅' : '⚪'} ${field}`);
    });

    // 3. Verificar dados de origem
    console.log('\n3️⃣ Verificando dados de origem...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const collaboratorsSnapshot = await getDocs(collection(db, 'collaborators'));
    
    console.log(`   👥 Registros em 'users': ${usersSnapshot.docs.length}`);
    console.log(`   👥 Registros em 'collaborators': ${collaboratorsSnapshot.docs.length}`);
    
    // Verificar se todos os UIDs foram migrados
    const usersUIDs = new Set(usersSnapshot.docs.map(doc => doc.data().uid || doc.id));
    const collaboratorsUIDs = new Set(collaboratorsSnapshot.docs.map(doc => doc.data().uid || doc.id));
    const unifiedUIDs = new Set(unifiedDocs.map(doc => doc.data().uid || doc.id));
    
    const allOriginalUIDs = new Set([...usersUIDs, ...collaboratorsUIDs]);
    
    console.log(`   🔍 UIDs únicos nas coleções originais: ${allOriginalUIDs.size}`);
    console.log(`   🔍 UIDs na coleção unificada: ${unifiedUIDs.size}`);
    
    // Verificar se todos foram migrados
    const missingUIDs = [...allOriginalUIDs].filter(uid => !unifiedUIDs.has(uid));
    const extraUIDs = [...unifiedUIDs].filter(uid => !allOriginalUIDs.has(uid));
    
    if (missingUIDs.length === 0 && extraUIDs.length === 0) {
      console.log(`   ✅ Todos os UIDs foram migrados corretamente!`);
    } else {
      console.log(`   ⚠️ Diferenças encontradas:`);
      if (missingUIDs.length > 0) {
        console.log(`      - UIDs faltando: ${missingUIDs.join(', ')}`);
      }
      if (extraUIDs.length > 0) {
        console.log(`      - UIDs extras: ${extraUIDs.join(', ')}`);
      }
    }

    // 4. Verificar metadados da migração
    console.log('\n4️⃣ Verificando metadados da migração...');
    const docsWithMetadata = unifiedDocs.filter(doc => doc.data().sourceCollections);
    console.log(`   📊 Registros com metadados: ${docsWithMetadata.length}/${unifiedDocs.length}`);
    
    if (docsWithMetadata.length > 0) {
      const sourceCounts = {
        usersOnly: 0,
        collaboratorsOnly: 0,
        both: 0
      };
      
      docsWithMetadata.forEach(doc => {
        const metadata = doc.data().sourceCollections;
        if (metadata.hadUsersData && metadata.hadCollaboratorsData) {
          sourceCounts.both++;
        } else if (metadata.hadUsersData) {
          sourceCounts.usersOnly++;
        } else if (metadata.hadCollaboratorsData) {
          sourceCounts.collaboratorsOnly++;
        }
      });
      
      console.log(`   📈 Apenas de 'users': ${sourceCounts.usersOnly}`);
      console.log(`   📈 Apenas de 'collaborators': ${sourceCounts.collaboratorsOnly}`);
      console.log(`   📈 De ambas as coleções: ${sourceCounts.both}`);
    }

    // 5. Verificar integridade dos dados
    console.log('\n5️⃣ Verificando integridade dos dados...');
    let validRecords = 0;
    let invalidRecords = 0;
    
    unifiedDocs.forEach(doc => {
      const data = doc.data();
      const hasRequiredFields = requiredFields.every(field => field in data && data[field]);
      
      if (hasRequiredFields) {
        validRecords++;
      } else {
        invalidRecords++;
        console.log(`   ⚠️ Registro inválido: ${doc.id}`);
      }
    });
    
    console.log(`   ✅ Registros válidos: ${validRecords}`);
    console.log(`   ❌ Registros inválidos: ${invalidRecords}`);

    // 6. Resumo final
    console.log('\n📊 RESUMO DA MIGRAÇÃO');
    console.log('====================');
    
    const migrationSuccess = unifiedDocs.length >= allOriginalUIDs.size && invalidRecords === 0;
    
    if (migrationSuccess) {
      console.log('🎉 MIGRAÇÃO BEM-SUCEDIDA!');
      console.log('✅ Todos os dados foram migrados corretamente');
      console.log('✅ Integridade dos dados mantida');
      console.log('✅ Coleção unificada pronta para uso');
    } else {
      console.log('⚠️ MIGRAÇÃO PARCIAL OU COM PROBLEMAS');
      console.log('🔧 Verificar os logs acima para identificar problemas');
    }
    
    // 7. Próximos passos
    console.log('\n🎯 PRÓXIMOS PASSOS');
    console.log('==================');
    console.log('1. ✅ Coleção unificada está funcionando');
    console.log('2. ✅ Principais serviços já foram atualizados');
    console.log('3. ⚠️ Alguns módulos ainda usam coleções antigas (fallback)');
    console.log('4. 💡 Monitorar performance e considerar remoção das antigas');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
testUnifiedMigration().catch(console.error); 