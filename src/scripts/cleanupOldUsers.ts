import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAVl9qEZUOxc6FVRZmM8ZHu-WlaU9TYEQE",
  authDomain: "cerrado-engenharia.firebaseapp.com",
  projectId: "cerrado-engenharia",
  storageBucket: "cerrado-engenharia.firebasestorage.app",
  messagingSenderId: "975123537185",
  appId: "1:975123537185:web:ec737ffd42df032dd5b260",
  measurementId: "G-B369H20BPQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupOldUsers() {
  try {
    console.log('🧹 Limpando coleção users antiga...\n');
    
    // 1. Listar documentos na coleção users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`📊 Documentos encontrados na coleção users: ${usersSnapshot.size}\n`);
    
    if (usersSnapshot.size === 0) {
      console.log('✅ Coleção users já está vazia!\n');
      return;
    }
    
    // 2. Mostrar o que será deletado
    console.log('🗑️ Documentos que serão removidos:\n');
    usersSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.firstName || 'Nome'} ${data.lastName || 'Sobrenome'}`);
      console.log(`   📧 Email: ${data.email || 'Não informado'}`);
      console.log(`   🎭 Hierarquia: ${data.hierarchyLevel || 'Não definido'}`);
      console.log(`   🆔 UID: ${doc.id}`);
      console.log('');
    });
    
    // 3. Confirmar se todos esses usuários existem na coleção unificada
    console.log('🔍 Verificando se esses usuários existem na coleção unificada...\n');
    
    const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    const unifiedUIDs = new Set(unifiedSnapshot.docs.map(doc => doc.id));
    
    let allExistInUnified = true;
    
    for (const userDoc of usersSnapshot.docs) {
      const exists = unifiedUIDs.has(userDoc.id);
      const status = exists ? '✅ Existe' : '❌ NÃO EXISTE';
      console.log(`   ${userDoc.id}: ${status} na coleção unificada`);
      
      if (!exists) {
        allExistInUnified = false;
      }
    }
    
    console.log('');
    
    if (!allExistInUnified) {
      console.log('⚠️ ATENÇÃO: Nem todos os usuários existem na coleção unificada!');
      console.log('❌ Operação cancelada por segurança.');
      console.log('💡 Certifique-se de que todos os usuários foram migrados antes de limpar.\n');
      return;
    }
    
    // 4. Deletar os documentos da coleção users
    console.log('🗑️ Deletando documentos da coleção users...\n');
    
    let deletedCount = 0;
    for (const userDoc of usersSnapshot.docs) {
      try {
        await deleteDoc(doc(db, 'users', userDoc.id));
        console.log(`✅ Deletado: ${userDoc.id}`);
        deletedCount++;
      } catch (error) {
        console.log(`❌ Erro ao deletar ${userDoc.id}:`, error);
      }
    }
    
    console.log(`\n🎉 Limpeza concluída!`);
    console.log(`📊 Documentos deletados: ${deletedCount}/${usersSnapshot.size}`);
    console.log(`✅ Agora o sistema usará APENAS a coleção "collaborators_unified"`);
    console.log(`🔧 Isso deve resolver os conflitos de permissões!\n`);
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

// Executar o script
cleanupOldUsers(); 