import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDocs, collection } from 'firebase/firestore';

// Configuração do Firebase para Node.js
const firebaseConfig = {
  apiKey: "AIzaSyAkLPLH1m4OC1V5jJZNP7yqSTayWaOBJDk",
  authDomain: "cerrado-web-genesis.firebaseapp.com",
  projectId: "cerrado-web-genesis",
  storageBucket: "cerrado-web-genesis.firebasestorage.app",
  messagingSenderId: "581644730056",
  appId: "1:581644730056:web:0e9a1dd5b8f06f1b3ee99b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// IDs específicos para Presidente
const PRESIDENTE_IDS = [
  'I5JVmgcrkXh6UYhkTYrhKWlutz63',
  'TyRG9NYt46Yy8TnjsBTr72YUNMK2'
];

async function updateUserHierarchy() {
  try {
    console.log('🔄 Iniciando atualização da hierarquia...');
    
    // 1. Atualizar usuários específicos para Presidente
    for (const userId of PRESIDENTE_IDS) {
      try {
        // Atualizar na coleção users
        await updateDoc(doc(db, 'users', userId), {
          hierarchyLevel: 'Presidente',
          updatedAt: new Date()
        });
        
        // Atualizar na coleção collaborators
        await updateDoc(doc(db, 'collaborators', userId), {
          hierarchyLevel: 'Presidente',
          updatedAt: new Date()
        });
        
        console.log(`✅ Usuário ${userId} atualizado para Presidente`);
      } catch (error) {
        console.log(`⚠️ Erro ao atualizar usuário ${userId}:`, error);
      }
    }
    
    // 2. Atualizar outros usuários para Estagiário/Auxiliar
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const collaboratorsSnapshot = await getDocs(collection(db, 'collaborators'));
    
    // Atualizar users
    for (const userDoc of usersSnapshot.docs) {
      if (!PRESIDENTE_IDS.includes(userDoc.id)) {
        try {
          await updateDoc(doc(db, 'users', userDoc.id), {
            hierarchyLevel: 'Estagiário/Auxiliar',
            updatedAt: new Date()
          });
          console.log(`✅ Usuário ${userDoc.id} atualizado para Estagiário/Auxiliar`);
        } catch (error) {
          console.log(`⚠️ Erro ao atualizar usuário ${userDoc.id}:`, error);
        }
      }
    }
    
    // Atualizar collaborators
    for (const collabDoc of collaboratorsSnapshot.docs) {
      if (!PRESIDENTE_IDS.includes(collabDoc.id)) {
        try {
          await updateDoc(doc(db, 'collaborators', collabDoc.id), {
            hierarchyLevel: 'Estagiário/Auxiliar',
            updatedAt: new Date()
          });
          console.log(`✅ Colaborador ${collabDoc.id} atualizado para Estagiário/Auxiliar`);
        } catch (error) {
          console.log(`⚠️ Erro ao atualizar colaborador ${collabDoc.id}:`, error);
        }
      }
    }
    
    console.log('🎉 Atualização da hierarquia concluída!');
    console.log('📋 Resumo:');
    console.log(`- ${PRESIDENTE_IDS.length} usuários definidos como Presidente`);
    console.log('- Demais usuários definidos como Estagiário/Auxiliar');
    
  } catch (error) {
    console.error('❌ Erro durante a atualização:', error);
  }
}

// Executar a função
updateUserHierarchy(); 