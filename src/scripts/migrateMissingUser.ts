import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';

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

async function migrateMissingUser() {
  try {
    console.log('🔄 Migrando usuário faltante para coleção unificada...\n');
    
    // 1. Buscar usuários que estão em users mas não em collaborators_unified
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    
    const unifiedUIDs = new Set(unifiedSnapshot.docs.map(doc => doc.id));
    const missingUsers = usersSnapshot.docs.filter(doc => !unifiedUIDs.has(doc.id));
    
    console.log(`📊 Usuários faltantes: ${missingUsers.length}\n`);
    
    if (missingUsers.length === 0) {
      console.log('✅ Todos os usuários já estão na coleção unificada!\n');
      return;
    }
    
    // 2. Migrar cada usuário faltante
    for (const userDoc of missingUsers) {
      const userData = userDoc.data();
      console.log(`🔄 Migrando: ${userData.firstName} ${userData.lastName} (${userData.email})`);
      
      // Criar documento unificado
      const unifiedData = {
        uid: userDoc.id,
        firstName: userData.firstName || 'Nome',
        lastName: userData.lastName || 'Sobrenome',
        email: userData.email || '',
        displayName: userData.displayName || `${userData.firstName || 'Nome'} ${userData.lastName || 'Sobrenome'}`,
        hierarchyLevel: userData.hierarchyLevel || 'Estagiário/Auxiliar',
        
        // Dados padrão para campos obrigatórios
        birthDate: userData.birthDate || new Date('1990-01-01'),
        phone: userData.phoneNumber || userData.phone || '',
        address: '',
        responsibleName: '',
        
        // Avatar/foto
        avatar: userData.avatar || userData.photoURL || null,
        photoURL: userData.photoURL || userData.avatar || null,
        
        // Metadados
        createdAt: userData.createdAt || new Date(),
        updatedAt: new Date(),
        
        // Campos de controle da migração
        migratedAt: new Date(),
        sourceCollections: {
          hadUsersData: true,
          hadCollaboratorsData: false
        }
      };
      
      // Salvar na coleção unificada
      await setDoc(doc(db, 'collaborators_unified', userDoc.id), unifiedData);
      console.log(`✅ Migrado: ${userData.firstName} ${userData.lastName}`);
    }
    
    console.log(`\n🎉 Migração concluída!`);
    console.log(`📊 Usuários migrados: ${missingUsers.length}`);
    console.log(`✅ Agora todos os usuários estão na coleção unificada!\n`);
    
    // 3. Verificar se agora podemos limpar a coleção users
    console.log('🔍 Verificando se agora podemos limpar a coleção users...\n');
    
    const newUnifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    const newUnifiedUIDs = new Set(newUnifiedSnapshot.docs.map(doc => doc.id));
    
    let allUsersExist = true;
    for (const userDoc of usersSnapshot.docs) {
      const exists = newUnifiedUIDs.has(userDoc.id);
      if (!exists) {
        allUsersExist = false;
        break;
      }
    }
    
    if (allUsersExist) {
      console.log('✅ Todos os usuários da coleção users agora existem na coleção unificada!');
      console.log('💡 Você pode executar cleanupOldUsers.ts agora para remover a coleção users.\n');
    } else {
      console.log('⚠️ Ainda há inconsistências. Verifique os dados.\n');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  }
}

// Executar o script
migrateMissingUser(); 