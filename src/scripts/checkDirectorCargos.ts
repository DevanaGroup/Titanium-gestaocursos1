import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

// Hierarquia do sistema
const HIERARCHY_LEVELS = [
  "Presidente",
  "Diretor", 
  "Diretor de TI",
  "Diretor Financeiro",
  "Diretor Comercial",
  "Gerente",
  "Coordenador",
  "Supervisor",
  "Líder Técnico",
  "Engenheiro",
  "Analista",
  "Financeiro",
  "Técnico/Assistente",
  "Comercial",
  "Estagiário/Auxiliar"
];

// Função para verificar permissões específicas
const getPermissionsForLevel = (level: string) => {
  const managerLevels = ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Financeiro"];
  const financialLevels = ["Presidente", "Diretor Financeiro"];
  const chatbotLevels = ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente"];
  
  return {
    canManageDepartment: managerLevels.includes(level),
    canViewFinancialReports: financialLevels.includes(level),
    canChatbotAccess: chatbotLevels.includes(level),
    canApproveExpenses: managerLevels.includes(level)
  };
};

async function checkDirectorCargos() {
  try {
    console.log('🔍 Verificando cargos de Diretor no sistema...\n');
    
    // 1. Verificar se "Diretor Comercial" existe na hierarquia
    console.log('📋 HIERARQUIA ATUAL DEFINIDA NO SISTEMA:');
    HIERARCHY_LEVELS.forEach((level, index) => {
      console.log(`   ${index + 1}. ${level}`);
    });
    
    const hasDirectorComercial = HIERARCHY_LEVELS.includes("Diretor Comercial");
    const hasDirectorFinanceiro = HIERARCHY_LEVELS.includes("Diretor Financeiro");
    
    console.log('\n🎯 STATUS DOS CARGOS PROCURADOS:');
    console.log(`   ✅ Diretor Financeiro: ${hasDirectorFinanceiro ? 'EXISTE' : 'NÃO EXISTE'}`);
    console.log(`   ${hasDirectorComercial ? '✅' : '❌'} Diretor Comercial: ${hasDirectorComercial ? 'EXISTE' : 'NÃO EXISTE'}`);
    
    // 2. Buscar usuários na coleção unificada
    console.log('\n👥 BUSCANDO USUÁRIOS NA COLEÇÃO UNIFICADA...\n');
    const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    
    // 3. Filtrar por cargos de diretor
    const allDirectors = unifiedSnapshot.docs.filter(doc => {
      const hierarchyLevel = doc.data().hierarchyLevel;
      return hierarchyLevel?.includes('Diretor');
    });
    
    console.log(`📊 Total de diretores encontrados: ${allDirectors.length}\n`);
    
    // 4. Agrupar por tipo de diretor
    const directorsByType = {};
    allDirectors.forEach(doc => {
      const data = doc.data();
      const level = data.hierarchyLevel;
      
      if (!directorsByType[level]) {
        directorsByType[level] = [];
      }
      
      directorsByType[level].push({
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        uid: doc.id
      });
    });
    
    // 5. Mostrar resultados por tipo
    console.log('📋 DIRETORES POR TIPO:\n');
    
    // Verificar Diretor Financeiro especificamente
    if (directorsByType['Diretor Financeiro']) {
      console.log('💰 DIRETOR FINANCEIRO:');
      directorsByType['Diretor Financeiro'].forEach((director, index) => {
        console.log(`   ${index + 1}. ${director.name} (${director.email})`);
        console.log(`      🆔 UID: ${director.uid}`);
        
        const permissions = getPermissionsForLevel('Diretor Financeiro');
        console.log(`      🔑 Permissões especiais:`);
        console.log(`         ✅ Acesso ao Financeiro`);
        console.log(`         ✅ Acesso a Relatórios`);
        console.log(`         ✅ Colaboradores`);
        console.log(`         ✅ ChatBot`);
        console.log(`         ✅ Configurações`);
      });
      console.log('');
    } else {
      console.log('💰 DIRETOR FINANCEIRO: ❌ Nenhum usuário encontrado\n');
    }
    
    // Verificar outros tipos de diretor
    Object.keys(directorsByType).forEach(directorType => {
      if (directorType !== 'Diretor Financeiro') {
        console.log(`🏢 ${directorType.toUpperCase()}:`);
        directorsByType[directorType].forEach((director, index) => {
          console.log(`   ${index + 1}. ${director.name} (${director.email})`);
          console.log(`      🆔 UID: ${director.uid}`);
          
          const permissions = getPermissionsForLevel(directorType);
          console.log(`      🔑 Permissões:`);
          console.log(`         ${permissions.canManageDepartment ? '✅' : '❌'} Colaboradores`);
          console.log(`         ${permissions.canChatbotAccess ? '✅' : '❌'} ChatBot`);
          console.log(`         ${permissions.canViewFinancialReports ? '✅' : '❌'} Financeiro`);
          console.log(`         ${permissions.canViewFinancialReports ? '✅' : '❌'} Relatórios`);
          console.log(`         ${permissions.canManageDepartment ? '✅' : '❌'} Configurações`);
        });
        console.log('');
      }
    });
    
    // 6. Verificar se existe cargo "Comercial" (não diretor)
    const comercialUsers = unifiedSnapshot.docs.filter(doc => {
      return doc.data().hierarchyLevel === 'Comercial';
    });
    
    if (comercialUsers.length > 0) {
      console.log('🛍️ COLABORADORES COMERCIAIS (não diretores):');
      comercialUsers.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. ${data.firstName} ${data.lastName} (${data.email})`);
        console.log(`      🆔 UID: ${doc.id}`);
        console.log(`      🔑 Permissões: Limitadas (sem acesso a gestão)`);
      });
      console.log('');
    }
    
    // 7. Sugestões
    console.log('💡 SUGESTÕES:\n');
    
    if (!hasDirectorComercial) {
      console.log('1. ⚠️ "Diretor Comercial" não existe na hierarquia do sistema');
      console.log('   💬 Seria útil adicionar este cargo para ter um diretor específico para área comercial');
      console.log('   🔧 Isso permitiria separar responsabilidades comerciais das administrativas\n');
    }
    
    if (!directorsByType['Diretor Financeiro']) {
      console.log('2. ⚠️ Nenhum usuário com cargo "Diretor Financeiro" encontrado');
      console.log('   💬 Este cargo tem permissões especiais para acessar módulos financeiros');
      console.log('   🔧 Considere promover alguém da área financeira para este cargo\n');
    }
    
    if (comercialUsers.length > 0 && !hasDirectorComercial) {
      console.log('3. 💼 Existem colaboradores "Comerciais" mas sem "Diretor Comercial"');
      console.log('   💬 Considere promover um dos comerciais para diretor da área');
      console.log('   🔧 Isso melhoraria a estrutura hierárquica comercial\n');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  }
}

// Executar o script
checkDirectorCargos(); 