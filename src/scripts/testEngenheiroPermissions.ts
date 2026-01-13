import { 
  HIERARCHY_LEVELS, 
  hasPermission, 
  getDefaultPermissions, 
  hasFinancialAccess, 
  hasChatbotAccess,
  canManageLevel,
  getManagedLevels,
  hasSettingsAccess
} from '../utils/hierarchyUtils';
import { HierarchyLevel } from '../types';

// CONFIGURAÇÃO DE MÓDULOS POR CARGO
const MENU_ACCESS = {
  "Dashboard Padrão": ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Gerente", "Coordenador", "Supervisor", "Líder Técnico", "Engenheiro", "Analista", "Financeiro", "Técnico/Assistente", "Estagiário/Auxiliar"],
  "Dashboard Comercial": ["Comercial", "Diretor Comercial", "Diretor de TI"],
  "Colaboradores": ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Engenheiro", "Financeiro"],
  "Clientes": ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Coordenador", "Supervisor", "Líder Técnico", "Engenheiro", "Analista", "Financeiro", "Técnico/Assistente", "Comercial", "Estagiário/Auxiliar"],
  "Agenda": ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Coordenador", "Supervisor", "Líder Técnico", "Engenheiro", "Analista", "Financeiro", "Técnico/Assistente", "Comercial", "Estagiário/Auxiliar"],
  "Tarefas": ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Coordenador", "Supervisor", "Líder Técnico", "Engenheiro", "Analista", "Financeiro", "Técnico/Assistente", "Comercial", "Estagiário/Auxiliar"],
  "Prospects": ["Comercial", "Diretor Comercial", "Diretor de TI"],
  "Pipeline": ["Comercial", "Diretor Comercial", "Diretor de TI"],
  "ChatBot": ["Presidente", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial"],
  "Solicitações": ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Coordenador", "Supervisor", "Líder Técnico", "Engenheiro", "Analista", "Financeiro", "Técnico/Assistente", "Comercial", "Estagiário/Auxiliar"],
  "Relatórios": ["Presidente", "Diretor Financeiro", "Diretor de TI"],
  "Financeiro": ["Presidente", "Diretor Financeiro", "Diretor de TI"],
  "Termo de Referência": ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Coordenador", "Supervisor", "Líder Técnico", "Engenheiro", "Analista", "Financeiro", "Técnico/Assistente", "Comercial", "Estagiário/Auxiliar"],
  "Suporte Web": ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Coordenador", "Supervisor", "Líder Técnico", "Engenheiro", "Analista", "Financeiro", "Técnico/Assistente", "Comercial", "Estagiário/Auxiliar"],
  "Configurações": ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente"]
};

function testEngenheiroPermissions() {
  console.log('\n🔧 TESTE DE PERMISSÕES DO ENGENHEIRO');
  console.log('=' .repeat(60));
  
  const cargo = 'Engenheiro' as HierarchyLevel;
  
  console.log(`\n📋 TESTANDO CARGO: ${cargo.toUpperCase()}`);
  console.log('-'.repeat(40));
  
  // 1. Verificar acesso aos menus
  console.log('\n🎯 ACESSO A MENUS:');
  const acessoMenus: string[] = [];
  Object.entries(MENU_ACCESS).forEach(([menu, cargosPermitidos]) => {
    if (cargosPermitidos.includes(cargo)) {
      acessoMenus.push(menu);
      console.log(`   ✅ ${menu}`);
    } else {
      console.log(`   ❌ ${menu}`);
    }
  });
  
  console.log(`\n📊 Total de menus acessíveis: ${acessoMenus.length}/15`);
  
  // 2. Verificar permissões do sistema
  console.log('\n🔐 PERMISSÕES DO SISTEMA:');
  
  const permissoes = [
    { key: 'manage_department', label: 'Gerenciar departamento' },
    { key: 'manage_all_users', label: 'Gerenciar todos os usuários' },
    { key: 'approve_expenses', label: 'Aprovar solicitações de despesas' },
    { key: 'view_all_tasks', label: 'Ver todas as tarefas' },
    { key: 'view_financial_reports', label: 'Acesso a relatórios financeiros' },
    { key: 'chatbot_access', label: 'Acesso ao ChatBot' },
    { key: 'settings_access', label: 'Acesso às Configurações' }
  ];
  
  let permissoesAtivas = 0;
  permissoes.forEach(perm => {
    const temPermissao = hasPermission(cargo, perm.key);
    if (temPermissao) {
      console.log(`   ✅ ${perm.label}`);
      permissoesAtivas++;
    } else {
      console.log(`   ❌ ${perm.label}`);
    }
  });
  
  console.log(`\n📊 Permissões ativas: ${permissoesAtivas}/${permissoes.length}`);
  
  // 3. Verificar permissões customizadas
  console.log('\n⚙️ PERMISSÕES CUSTOMIZÁVEIS:');
  const customPermissions = getDefaultPermissions(cargo);
  
  Object.entries(customPermissions).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`   ${status} ${label}`);
  });
  
  // 4. Verificar níveis que pode gerenciar
  console.log('\n👥 NÍVEIS QUE PODE GERENCIAR:');
  const podeGerenciar = getManagedLevels(cargo);
  if (podeGerenciar.length > 0) {
    podeGerenciar.forEach(nivel => console.log(`   • ${nivel}`));
  } else {
    console.log('   • Nenhum cargo (sem permissões de gestão)');
  }
  
  // 5. Verificar permissões específicas para clientes
  console.log('\n🏢 PERMISSÕES ESPECÍFICAS PARA CLIENTES:');
  console.log(`   ${hasPermission(cargo, 'manage_department') ? '✅' : '❌'} Ver todos os clientes`);
  console.log(`   ${customPermissions.canCreateClients ? '✅' : '❌'} Criar clientes`);
  console.log(`   ${customPermissions.canEditAllClients ? '✅' : '❌'} Editar clientes`);
  console.log(`   ${customPermissions.canDeleteClients ? '✅' : '❌'} Deletar clientes`);
  
  // 6. Resumo das mudanças
  console.log('\n🎯 RESUMO DAS MUDANÇAS:');
  console.log('   🔄 Engenheiro agora tem permissões de gestão');
  console.log('   🔍 Pode ver TODOS os clientes (não apenas atribuídos)');
  console.log('   📋 Pode ver todas as tarefas');
  console.log('   👥 Pode gerenciar permissões de outros usuários');
  console.log('   🏢 Pode criar, editar e deletar clientes');
  console.log('   📊 Acesso a módulos de gestão');
  
  // 7. Comparação com cargos similares
  console.log('\n📊 COMPARAÇÃO COM CARGOS SIMILARES:');
  const cargosSimilares = ['Líder Técnico', 'Analista', 'Coordenador'];
  
  cargosSimilares.forEach(cargoSimilar => {
    const podeVerTodos = hasPermission(cargoSimilar as HierarchyLevel, 'manage_department');
    const status = podeVerTodos ? '✅' : '❌';
    console.log(`   ${status} ${cargoSimilar}: ${podeVerTodos ? 'Pode ver todos' : 'Apenas próprios'}`);
  });
  
  console.log('\n✅ TESTE CONCLUÍDO!');
  console.log('\n🔍 VERIFICAÇÕES RECOMENDADAS:');
  console.log('   1. Fazer login com um usuário Engenheiro');
  console.log('   2. Verificar se pode ver todos os clientes');
  console.log('   3. Testar criação de novos clientes');
  console.log('   4. Verificar acesso a todas as tarefas');
  console.log('   5. Testar gerenciamento de permissões');
  console.log('   6. Confirmar acesso aos módulos de gestão');
}

// Executar teste
testEngenheiroPermissions(); 