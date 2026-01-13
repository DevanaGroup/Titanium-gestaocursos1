import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

// Simular as funções do hierarchyUtils
const hasPermission = (userLevel: string, permission: string): boolean => {
  const canManageAll = ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Financeiro"].includes(userLevel);
  
  switch (permission) {
    case 'manage_department':
    case 'manage_all_users':
    case 'approve_expenses':
      return canManageAll;
      
    case 'view_financial_reports':
      return ["Presidente", "Diretor Financeiro"].includes(userLevel);
      
    case 'view_all_tasks':
      return ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente"].includes(userLevel);
      
    case 'chatbot_access':
      return ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente"].includes(userLevel);
      
    case 'view_own_data':
    case 'create_expense_requests':
      return true;
      
    default:
      return canManageAll;
  }
};

// Função para determinar menus disponíveis
const getAvailableMenus = (userLevel: string) => {
  const commercialMenus = ["commercial-dashboard", "prospects", "pipeline"];
  const generalMenus = ["calendar", "tasks", "expense-requests", "termo-referencia"];
  const managerMenus = ["collaborators", "clients", "chatbot", "settings"];
  const financialMenus = ["financial", "reports"];
  
  let availableMenus: string[] = [];
  
  // Menus comerciais específicos
  if (userLevel === 'Comercial' || userLevel === 'Diretor Comercial') {
    availableMenus = [...availableMenus, ...commercialMenus];
  }
  
  // Menus gerais (todos têm acesso)
  availableMenus = [...availableMenus, ...generalMenus];
  
  // Menus de gestão
  if (hasPermission(userLevel, 'manage_department')) {
    availableMenus = [...availableMenus, ...managerMenus];
  }
  
  // Menus financeiros
  if (hasPermission(userLevel, 'view_financial_reports')) {
    availableMenus = [...availableMenus, ...financialMenus];
  }
  
  // Menu home/dashboard padrão
  if (userLevel !== 'Comercial' && userLevel !== 'Diretor Comercial') {
    availableMenus = ['home', ...availableMenus];
  }
  
  return availableMenus.sort();
};

async function testDirectorComercialPermissions() {
  try {
    console.log('🧪 TESTANDO PERMISSÕES DO DIRETOR COMERCIAL\n');
    
    // Definir cargos para comparação
    const roles = [
      'Estagiário/Auxiliar',
      'Comercial',
      'Diretor Comercial',
      'Gerente',
      'Diretor Financeiro',
      'Presidente'
    ];
    
    console.log('📋 COMPARAÇÃO DE PERMISSÕES POR CARGO:\n');
    
    roles.forEach((role, index) => {
      console.log(`${index + 1}. 🏢 ${role.toUpperCase()}`);
      
      // Testar permissões principais
      const permissions = [
        'manage_department',
        'chatbot_access',
        'view_financial_reports',
        'view_all_tasks',
        'approve_expenses'
      ];
      
      console.log('   🔑 Permissões:');
      permissions.forEach(permission => {
        const hasAccess = hasPermission(role, permission);
        const icon = hasAccess ? '✅' : '❌';
        console.log(`      ${icon} ${permission.replace('_', ' ')}`);
      });
      
      // Mostrar menus disponíveis
      const menus = getAvailableMenus(role);
      console.log('   📱 Menus disponíveis:');
      if (menus.length > 0) {
        menus.forEach(menu => {
          console.log(`      • ${menu}`);
        });
      } else {
        console.log('      (nenhum menu específico)');
      }
      
      console.log('');
    });
    
    // Teste específico do Diretor Comercial
    console.log('🎯 ANÁLISE ESPECÍFICA DO DIRETOR COMERCIAL:\n');
    
    const directorComercial = 'Diretor Comercial';
    
    console.log('✅ VANTAGENS do Diretor Comercial vs Comercial simples:');
    console.log('   • ✅ Acesso a gestão de Colaboradores');
    console.log('   • ✅ Acesso a ChatBot');
    console.log('   • ✅ Acesso a Configurações do sistema');
    console.log('   • ✅ Pode aprovar solicitações de despesas');
    console.log('   • ✅ Pode ver todas as tarefas (não apenas as próprias)');
    console.log('   • ✅ Mantém acesso aos módulos comerciais específicos');
    
    console.log('\n⚠️ LIMITAÇÕES do Diretor Comercial vs Diretor Financeiro:');
    console.log('   • ❌ NÃO tem acesso ao módulo Financeiro');
    console.log('   • ❌ NÃO tem acesso aos Relatórios financeiros');
    console.log('   • ✅ Foco na área comercial, não financeira');
    
    console.log('\n📱 MÓDULOS EXCLUSIVOS DO DIRETOR COMERCIAL:');
    console.log('   • 📊 Dashboard Comercial');
    console.log('   • 🎯 Prospects');
    console.log('   • 🔄 Pipeline de vendas');
    console.log('   • 👥 Gestão de colaboradores');
    console.log('   • 🤖 ChatBot');
    console.log('   • ⚙️ Configurações');
    
    // Testar criação de usuário teste (opcional)
    console.log('\n💡 PRÓXIMOS PASSOS PARA TESTE:');
    console.log('1. Criar um usuário com cargo "Diretor Comercial" no Firebase');
    console.log('2. Fazer login com esse usuário');
    console.log('3. Verificar se tem acesso a:');
    console.log('   • Dashboard Comercial como página inicial');
    console.log('   • Prospects e Pipeline');
    console.log('   • Colaboradores e Configurações');
    console.log('   • ChatBot');
    console.log('4. Verificar se NÃO tem acesso a:');
    console.log('   • Financeiro');
    console.log('   • Relatórios');
    
    console.log('\n🔧 PARA CRIAR USUÁRIO TESTE, use este comando:');
    console.log('   (Substitua os dados pelos reais)');
    console.log(`
    await setDoc(doc(db, 'collaborators_unified', 'TEST_DIRECTOR_COMERCIAL_UID'), {
      firstName: 'Teste',
      lastName: 'Diretor Comercial',
      email: 'diretor.comercial@cerrado.com',
      hierarchyLevel: 'Diretor Comercial',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    `);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
testDirectorComercialPermissions(); 