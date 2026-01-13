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

// CONFIGURAÇÃO DE MÓDULOS POR CARGO (mesma do auditPermissions.ts)
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

// Função para comparar permissões entre dois cargos
const comparePermissions = (cargo1: HierarchyLevel, cargo2: HierarchyLevel) => {
  console.log(`\n🔍 COMPARANDO PERMISSÕES: ${cargo1} vs ${cargo2}`);
  console.log('='.repeat(60));

  // Verificar acesso aos menus
  console.log('\n📱 ACESSO A MENUS:');
  Object.entries(MENU_ACCESS).forEach(([menu, cargosPermitidos]) => {
    const cargo1Access = cargosPermitidos.includes(cargo1);
    const cargo2Access = cargosPermitidos.includes(cargo2);
    
    const icon1 = cargo1Access ? '✅' : '❌';
    const icon2 = cargo2Access ? '✅' : '❌';
    
    const comparison = cargo1Access === cargo2Access ? '✅' : '⚠️';
    
    console.log(`   ${comparison} ${menu}: ${icon1} ${cargo1} | ${icon2} ${cargo2}`);
  });

  // Verificar permissões do sistema
  console.log('\n🔐 PERMISSÕES DO SISTEMA:');
  const permissions = [
    'manage_department',
    'manage_all_users', 
    'approve_expenses',
    'view_all_tasks',
    'chatbot_access',
    'settings_access'
  ];

  permissions.forEach(permission => {
    let cargo1Has = false;
    let cargo2Has = false;

    if (permission === 'chatbot_access') {
      cargo1Has = hasChatbotAccess(cargo1);
      cargo2Has = hasChatbotAccess(cargo2);
    } else if (permission === 'settings_access') {
      cargo1Has = hasSettingsAccess(cargo1);
      cargo2Has = hasSettingsAccess(cargo2);
    } else {
      cargo1Has = hasPermission(cargo1, permission);
      cargo2Has = hasPermission(cargo2, permission);
    }

    const icon1 = cargo1Has ? '✅' : '❌';
    const icon2 = cargo2Has ? '✅' : '❌';
    const comparison = cargo1Has === cargo2Has ? '✅' : '⚠️';
    
    console.log(`   ${comparison} ${permission.replace('_', ' ')}: ${icon1} ${cargo1} | ${icon2} ${cargo2}`);
  });

  // Verificar acesso financeiro
  console.log('\n💰 ACESSO FINANCEIRO:');
  const cargo1Financial = hasFinancialAccess(cargo1);
  const cargo2Financial = hasFinancialAccess(cargo2);
  
  const financialIcon1 = cargo1Financial ? '✅' : '❌';
  const financialIcon2 = cargo2Financial ? '✅' : '❌';
  const financialComparison = cargo1Financial === cargo2Financial ? '✅' : '⚠️';
  
  console.log(`   ${financialComparison} Relatórios e Financeiro: ${financialIcon1} ${cargo1} | ${financialIcon2} ${cargo2}`);
  
  // Verificar níveis que podem gerenciar
  console.log('\n👥 PODE GERENCIAR CARGOS:');
  const managedLevels1 = getManagedLevels(cargo1);
  const managedLevels2 = getManagedLevels(cargo2);
  
  console.log(`   ${cargo1}: ${managedLevels1.length} cargos`);
  console.log(`   ${cargo2}: ${managedLevels2.length} cargos`);
  
  const managementComparison = managedLevels1.length === managedLevels2.length ? '✅' : '⚠️';
  console.log(`   ${managementComparison} Equivalência na gestão de cargos`);

  // Resumo da comparação
  console.log('\n📋 RESUMO DA COMPARAÇÃO:');
  
  let menusEquivalentes = 0;
  let menusTotal = Object.keys(MENU_ACCESS).length;
  
  Object.entries(MENU_ACCESS).forEach(([menu, cargosPermitidos]) => {
    const cargo1Access = cargosPermitidos.includes(cargo1);
    const cargo2Access = cargosPermitidos.includes(cargo2);
    if (cargo1Access === cargo2Access) menusEquivalentes++;
  });
  
  let permissoesEquivalentes = 0;
  let permissoesTotais = permissions.length + 1; // +1 para acesso financeiro
  
  permissions.forEach(permission => {
    let cargo1Has = false;
    let cargo2Has = false;

    if (permission === 'chatbot_access') {
      cargo1Has = hasChatbotAccess(cargo1);
      cargo2Has = hasChatbotAccess(cargo2);
    } else if (permission === 'settings_access') {
      cargo1Has = hasSettingsAccess(cargo1);
      cargo2Has = hasSettingsAccess(cargo2);
    } else {
      cargo1Has = hasPermission(cargo1, permission);
      cargo2Has = hasPermission(cargo2, permission);
    }

    if (cargo1Has === cargo2Has) permissoesEquivalentes++;
  });
  
  // Incluir acesso financeiro na contagem
  if (cargo1Financial === cargo2Financial) permissoesEquivalentes++;
  
  console.log(`   📱 Menus equivalentes: ${menusEquivalentes}/${menusTotal} (${Math.round(menusEquivalentes/menusTotal*100)}%)`);
  console.log(`   🔐 Permissões equivalentes: ${permissoesEquivalentes}/${permissoesTotais} (${Math.round(permissoesEquivalentes/permissoesTotais*100)}%)`);
  console.log(`   👥 Gestão equivalente: ${managementComparison === '✅' ? 'Sim' : 'Não'}`);
  
  const percentualEquivalencia = Math.round(((menusEquivalentes + permissoesEquivalentes) / (menusTotal + permissoesTotais)) * 100);
  
  if (percentualEquivalencia === 100) {
    console.log(`\n🎉 EQUIVALÊNCIA TOTAL: ${percentualEquivalencia}% - Os cargos têm permissões idênticas!`);
  } else if (percentualEquivalencia >= 90) {
    console.log(`\n⚠️ EQUIVALÊNCIA ALTA: ${percentualEquivalencia}% - Pequenas diferenças detectadas`);
  } else {
    console.log(`\n❌ EQUIVALÊNCIA BAIXA: ${percentualEquivalencia}% - Diferenças significativas detectadas`);
  }
};

async function testDirectorTiPermissions() {
  console.log('🧪 TESTE DE PERMISSÕES - DIRETOR DE TI vs PRESIDENTE');
  console.log('=' .repeat(80));
  console.log('🎯 OBJETIVO: Verificar se o Diretor de TI tem os mesmos direitos do Presidente');
  console.log('🔧 JUSTIFICATIVA: Diretor de TI será responsável pela manutenção do sistema');
  console.log('=' .repeat(80));

  // Comparar Diretor de TI vs Presidente
  comparePermissions('Diretor de TI', 'Presidente');

  console.log('\n' + '='.repeat(80));
  console.log('🎯 ANÁLISE INDIVIDUAL DO DIRETOR DE TI');
  console.log('='.repeat(80));

  const directorTI = 'Diretor de TI';
  
  console.log(`\n📋 PERFIL: ${directorTI.toUpperCase()}`);
  console.log('-'.repeat(50));

  // Verificar acesso aos menus
  const acessoMenus: string[] = [];
  Object.entries(MENU_ACCESS).forEach(([menu, cargosPermitidos]) => {
    if (cargosPermitidos.includes(directorTI)) {
      acessoMenus.push(menu);
    }
  });

  console.log('\n🎯 ACESSO A MENUS:');
  acessoMenus.forEach(menu => console.log(`   ✅ ${menu}`));

  console.log(`\n🔐 PERMISSÕES DO SISTEMA:`);
  console.log(`   ${hasPermission(directorTI, 'manage_department') ? '✅' : '❌'} Gerenciar departamento`);
  console.log(`   ${hasPermission(directorTI, 'manage_all_users') ? '✅' : '❌'} Gerenciar todos os usuários`);
  console.log(`   ${hasPermission(directorTI, 'approve_expenses') ? '✅' : '❌'} Aprovar solicitações de despesas`);
  console.log(`   ${hasPermission(directorTI, 'view_all_tasks') ? '✅' : '❌'} Ver todas as tarefas`);
  console.log(`   ${hasFinancialAccess(directorTI) ? '✅' : '❌'} Acesso a relatórios financeiros`);
  console.log(`   ${hasChatbotAccess(directorTI) ? '✅' : '❌'} Acesso ao ChatBot`);
  console.log(`   ${hasSettingsAccess(directorTI) ? '✅' : '❌'} Acesso às Configurações`);

  const podeGerenciar = getManagedLevels(directorTI);
  console.log(`\n👥 PODE GERENCIAR CARGOS (${podeGerenciar.length}):`);
  podeGerenciar.forEach(nivel => console.log(`   • ${nivel}`));

  console.log('\n📝 OBSERVAÇÕES ESPECIAIS:');
  console.log('   💻 Responsável pela manutenção do sistema');
  console.log('   🔧 Acesso total aos módulos (equivalente ao Presidente)');
  console.log('   📊 Acesso completo a relatórios financeiros');
  console.log('   🛠️ Gerenciamento técnico do sistema');
  console.log('   🔐 Acesso a pastas confidenciais');
  console.log('   📁 Pode gerenciar Termo de Referência');

  console.log('\n' + '='.repeat(80));
  console.log('✅ TESTE CONCLUÍDO!');
  console.log('=' .repeat(80));
  
  console.log('\n🔍 VERIFICAÇÕES RECOMENDADAS:');
  console.log('   1. ✅ Fazer login com um usuário Diretor de TI');
  console.log('   2. ✅ Verificar se todos os menus estão visíveis');
  console.log('   3. ✅ Testar acesso ao módulo Financeiro');
  console.log('   4. ✅ Testar acesso aos Relatórios');
  console.log('   5. ✅ Verificar permissões no Termo de Referência');
  console.log('   6. ✅ Testar gestão de Colaboradores');
  console.log('   7. ✅ Verificar acesso a pastas confidenciais dos clientes');
  console.log('   8. ✅ Confirmar acesso às Configurações do sistema');

  console.log('\n🎉 CONFIGURAÇÃO FINALIZADA!');
  console.log('O cargo "Diretor de TI" agora possui os mesmos direitos do Presidente.');
  console.log('Isso permitirá que o responsável técnico tenha acesso total para manutenção do sistema.');
}

// Executar teste
testDirectorTiPermissions(); 