import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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
const auth = getAuth(app);

// IDs específicos para Presidente (atualize com os IDs corretos do seu usuário)
const PRESIDENTE_DATA = [
  {
    uid: 'I5JVmgcrkXh6UYhkTYrhKWlutz63',
    email: 'presidente1@cerrado.com', // ⚠️ SUBSTITUA pelo email real
    firstName: 'Nome', // ⚠️ SUBSTITUA pelo nome real
    lastName: 'Presidente', // ⚠️ SUBSTITUA pelo sobrenome real
    displayName: 'Nome Presidente',
    hierarchyLevel: 'Presidente',
    phoneNumber: '+5561999999999', // ⚠️ SUBSTITUA pelo telefone real
    phone: '+5561999999999',
    birthDate: new Date('1980-01-01'), // ⚠️ SUBSTITUA pela data real
    photoURL: null,
    avatar: null,
    customPermissions: {
      canCreateCollaborators: true,
      canViewAllCollaborators: true,
      canEditAllCollaborators: true,
      canDeleteCollaborators: true,
      canCreateClients: true,
      canViewAllClients: true,
      canEditAllClients: true,
      canDeleteClients: true,
      canViewAllTasks: true,
      canManagePermissions: true,
      canApproveExpenses: true,
      canViewFinancialReports: true
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    migratedAt: new Date(),
    sourceCollections: {
      hadUsersData: true,
      hadCollaboratorsData: true
    }
  }
  // ⚠️ ADICIONE MAIS PRESIDENTES AQUI SE NECESSÁRIO
];

async function createPresidentsInUnifiedCollection() {
  try {
    console.log('🔄 Criando presidentes na coleção unificada...');
    
    // Criar APENAS na coleção collaborators_unified
    console.log('👥 Criando presidentes na coleção collaborators_unified...');
    
    for (const userData of PRESIDENTE_DATA) {
      await setDoc(doc(db, 'collaborators_unified', userData.uid), userData);
      console.log(`✅ Presidente ${userData.displayName} criado na coleção unificada`);
    }
    
    console.log('🎉 Presidentes criados com sucesso!');
    console.log('📋 Resumo:');
    console.log(`- ${PRESIDENTE_DATA.length} presidentes criados`);
    console.log('- Usando APENAS a coleção "collaborators_unified"');
    console.log('- Permissões completas aplicadas');
    
    // Verificar se foi criado corretamente
    const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    console.log(`📊 Verificação: ${unifiedSnapshot.size} documentos na coleção unificada`);
    
    if (unifiedSnapshot.size > 0) {
      console.log('\n👥 Usuários na coleção unificada:');
      unifiedSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.firstName} ${data.lastName} (${data.email}) - ${data.hierarchyLevel}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro durante a criação:', error);
  }
}

// Executar o script
createPresidentsInUnifiedCollection(); 