import { 
  HIERARCHY_LEVELS, 
  hasPermission, 
  getDefaultPermissions, 
  hasFinancialAccess, 
  hasChatbotAccess,
  canManageLevel,
  getManagedLevels,
  getLevelNumber
} from '../utils/hierarchyUtils';
import { HierarchyLevel } from '../types';

interface PermissionMatrix {
  [cargo: string]: {
    acessoMenus: string[];
    permissoesSistema: string[];
    podeGerenciar: string[];
    observacoes: string[];
  }
}

// CONFIGURAÇÃO DE MÓDULOS POR CARGO
const MENU_ACCESS = {
  "Dashboard Padrão": ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Gerente", "Coordenador", "Supervisor", "Líder Técnico", "Engenheiro", "Analista", "Financeiro", "Técnico/Assistente", "Estagiário/Auxiliar"],
  "Dashboard Comercial": ["Comercial", "Diretor Comercial", "Diretor de TI"],
  "Colaboradores": ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Financeiro"],
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

function auditarPermissoes() {
  console.log('\n🔐 AUDITORIA COMPLETA DE PERMISSÕES POR CARGO\n');
  console.log('=' .repeat(80));
  
  const permissionMatrix: PermissionMatrix = {};
  
  HIERARCHY_LEVELS.forEach(cargo => {
    console.log(`\n📋 ${cargo.toUpperCase()}`);
    console.log('-'.repeat(60));
    
    // Verificar acesso aos menus
    const acessoMenus: string[] = [];
    Object.entries(MENU_ACCESS).forEach(([menu, cargosPermitidos]) => {
      if (cargosPermitidos.includes(cargo)) {
        acessoMenus.push(menu);
      }
    });
    
    // Verificar permissões do sistema
    const permissoes: string[] = [];
    
    // Gestão de departamento
    if (hasPermission(cargo, 'manage_department')) {
      permissoes.push('✅ Gerenciar departamento');
    } else {
      permissoes.push('❌ Gerenciar departamento');
    }
    
    // Gestão de usuários
    if (hasPermission(cargo, 'manage_all_users')) {
      permissoes.push('✅ Gerenciar todos os usuários');
    } else {
      permissoes.push('❌ Gerenciar todos os usuários');
    }
    
    // Aprovação de despesas
    if (hasPermission(cargo, 'approve_expenses')) {
      permissoes.push('✅ Aprovar solicitações de despesas');
    } else {
      permissoes.push('❌ Aprovar solicitações de despesas');
    }
    
    // Visualizar todas as tarefas
    if (hasPermission(cargo, 'view_all_tasks')) {
      permissoes.push('✅ Ver todas as tarefas');
    } else {
      permissoes.push('❌ Ver todas as tarefas (apenas próprias)');
    }
    
    // Acesso financeiro
    if (hasFinancialAccess(cargo)) {
      permissoes.push('✅ Acesso a relatórios financeiros');
    } else {
      permissoes.push('❌ Acesso a relatórios financeiros');
    }
    
    // Acesso ao ChatBot
    if (hasChatbotAccess(cargo)) {
      permissoes.push('✅ Acesso ao ChatBot');
    } else {
      permissoes.push('❌ Acesso ao ChatBot');
    }
    
    // Verificar quais níveis pode gerenciar
    const podeGerenciar = getManagedLevels(cargo);
    
    // Observações especiais baseadas no número do nível
    const observacoes: string[] = [];
    const levelNum = getLevelNumber(cargo);
    
    if (levelNum === 1) {
      observacoes.push('🔝 Maior nível hierárquico');
      observacoes.push('⚠️ Não pode deletar outros do mesmo nível');
      observacoes.push('🎯 Acesso total ao sistema');
    }
    
    if (levelNum === 2) {
      observacoes.push('📊 Alto nível de permissões');
      observacoes.push('✅ Pode aprovar despesas');
      observacoes.push('✅ Acesso ao ChatBot');
    }
    
    if (levelNum === 3) {
      observacoes.push('⚙️ Permissões intermediárias');
      observacoes.push('✅ Pode gerenciar departamento');
      observacoes.push('✅ Pode ver relatórios financeiros');
    }
    
    if (levelNum === 4) {
      observacoes.push('📝 Permissões básicas');
      observacoes.push('⚠️ Acesso limitado');
    }
    
    if (levelNum === 5) {
      observacoes.push('📚 Nível inicial - permissões mínimas');
      observacoes.push('🔒 Apenas dados próprios');
    }
    
    permissionMatrix[cargo] = {
      acessoMenus,
      permissoesSistema: permissoes,
      podeGerenciar,
      observacoes
    };
    
    // Exibir informações
    console.log('\n🎯 ACESSO A MENUS:');
    acessoMenus.forEach(menu => console.log(`   • ${menu}`));
    
    console.log('\n🔐 PERMISSÕES DO SISTEMA:');
    permissoes.forEach(perm => console.log(`   ${perm}`));
    
    console.log('\n👥 PODE GERENCIAR CARGOS:');
    if (podeGerenciar.length > 0) {
      podeGerenciar.forEach(nivel => console.log(`   • ${nivel}`));
    } else {
      console.log('   • Nenhum cargo (sem permissões de gestão)');
    }
    
    if (observacoes.length > 0) {
      console.log('\n📝 OBSERVAÇÕES:');
      observacoes.forEach(obs => console.log(`   ${obs}`));
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 RESUMO DA AUDITORIA');
  console.log('='.repeat(80));
  
  // Resumo de cargos com permissões especiais
  console.log('\n🔴 CARGOS COM ACESSO FINANCEIRO:');
  HIERARCHY_LEVELS.filter(cargo => hasFinancialAccess(cargo))
    .forEach(cargo => console.log(`   • ${cargo}`));
  
  console.log('\n🤖 CARGOS COM ACESSO AO CHATBOT:');
  HIERARCHY_LEVELS.filter(cargo => hasChatbotAccess(cargo))
    .forEach(cargo => console.log(`   • ${cargo}`));
  
  console.log('\n👁️ CARGOS QUE VEEM TODAS AS TAREFAS:');
  HIERARCHY_LEVELS.filter(cargo => hasPermission(cargo, 'view_all_tasks'))
    .forEach(cargo => console.log(`   • ${cargo}`));
  
  console.log('\n🏛️ CARGOS COM PERMISSÕES DE GESTÃO:');
  HIERARCHY_LEVELS.filter(cargo => hasPermission(cargo, 'manage_department'))
    .forEach(cargo => console.log(`   • ${cargo}`));
  
  console.log('\n💼 CARGOS COMERCIAIS:');
  ['Comercial', 'Diretor Comercial'].forEach(cargo => {
    if (HIERARCHY_LEVELS.includes(cargo as HierarchyLevel)) {
      console.log(`   • ${cargo}`);
    }
  });
  
  console.log('\n✅ AUDITORIA CONCLUÍDA!');
  console.log('\n🔍 VERIFICAÇÕES RECOMENDADAS:');
  console.log('   1. Testar login com cada cargo');
  console.log('   2. Verificar menus disponíveis');
  console.log('   3. Testar permissões de gestão');
  console.log('   4. Validar acesso aos módulos específicos');
  console.log('   5. Confirmar restrições financeiras');
  
  return permissionMatrix;
}

// Executar auditoria
auditarPermissoes(); 