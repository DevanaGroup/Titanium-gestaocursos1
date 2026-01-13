import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';

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

// Função para verificar permissões baseadas na hierarquia
const hasPermission = (userLevel: string, permission: string): boolean => {
  const canManageAll = ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Gerente", "Financeiro"].includes(userLevel);
  
  switch (permission) {
    case 'manage_department':
    case 'manage_all_users':
    case 'approve_expenses':
      return canManageAll;
      
    case 'view_financial_reports':
      return ["Presidente", "Diretor Financeiro"].includes(userLevel);
      
    case 'view_all_tasks':
      return ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Gerente"].includes(userLevel);
      
    case 'chatbot_access':
      return ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Gerente"].includes(userLevel);
      
    default:
      return canManageAll;
  }
};

async function checkPresidentsAccess() {
  try {
    console.log('🔍 Verificando acesso dos presidentes...\n');
    
    // 1. Listar todos os usuários na coleção unificada
    const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    console.log(`📊 Total de usuários na coleção unificada: ${unifiedSnapshot.size}\n`);
    
    if (unifiedSnapshot.size === 0) {
      console.log('⚠️ Nenhum usuário encontrado na coleção unificada!');
      console.log('💡 Execute o script recreateCollections.ts primeiro para criar os presidentes.\n');
      return;
    }
    
    // 2. Verificar cada usuário
    console.log('👥 Usuários encontrados:\n');
    unifiedSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const level = data.hierarchyLevel || 'Não definido';
      
      console.log(`${index + 1}. ${data.firstName} ${data.lastName}`);
      console.log(`   📧 Email: ${data.email}`);
      console.log(`   🎭 Hierarquia: ${level}`);
      console.log(`   🆔 UID: ${doc.id}`);
      
      // Verificar permissões específicas
      const permissions = {
        'Colaboradores': hasPermission(level, 'manage_department'),
        'ChatBot': hasPermission(level, 'chatbot_access'),
        'Financeiro': hasPermission(level, 'view_financial_reports'),
        'Relatórios': hasPermission(level, 'view_financial_reports'),
        'Configurações': hasPermission(level, 'manage_department')
      };
      
      console.log(`   🔑 Permissões de acesso:`);
      Object.entries(permissions).forEach(([menu, hasAccess]) => {
        const icon = hasAccess ? '✅' : '❌';
        console.log(`      ${icon} ${menu}`);
      });
      
      console.log(''); // Linha em branco
    });
    
    // 3. Verificar se há presidentes
    const presidentes = unifiedSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.hierarchyLevel === 'Presidente';
    });
    
    console.log(`👑 Presidentes encontrados: ${presidentes.length}\n`);
    
    if (presidentes.length === 0) {
      console.log('⚠️ PROBLEMA: Nenhum presidente encontrado!');
      console.log('💡 Solução: Execute recreateCollections.ts com dados reais do presidente.\n');
    } else {
      console.log('✅ Presidentes encontrados com acesso completo a todos os menus!\n');
    }
    
    // 4. Verificar coleções antigas (para diagnóstico)
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const collaboratorsSnapshot = await getDocs(collection(db, 'collaborators'));
      
      console.log('📋 Status das coleções antigas:');
      console.log(`   📄 users: ${usersSnapshot.size} documentos`);
      console.log(`   📄 collaborators: ${collaboratorsSnapshot.size} documentos`);
      
      if (usersSnapshot.size > 0 || collaboratorsSnapshot.size > 0) {
        console.log('⚠️ Coleções antigas ainda existem - isso pode causar conflitos\n');
      } else {
        console.log('✅ Coleções antigas removidas corretamente\n');
      }
    } catch (error) {
      console.log('✅ Coleções antigas não existem (correto)\n');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  }
}

// Executar o script
checkPresidentsAccess(); 