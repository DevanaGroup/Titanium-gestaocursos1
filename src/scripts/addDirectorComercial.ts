import fs from 'fs';
import path from 'path';

// Arquivos que precisam ser atualizados
const FILES_TO_UPDATE = [
  'src/types/index.ts',
  'src/types/user.ts',
  'src/utils/hierarchyUtils.ts'
];

// Nova hierarquia com Diretor Comercial
const NEW_HIERARCHY = [
  "Presidente",
  "Diretor", 
  "Diretor de TI",
  "Diretor Financeiro",
  "Diretor Comercial",  // <-- NOVO CARGO
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

async function addDirectorComercial() {
  try {
    console.log('🔧 Adicionando "Diretor Comercial" ao sistema...\n');
    
    // 1. Atualizar src/types/index.ts
    console.log('📝 Atualizando src/types/index.ts...');
    const typesIndexPath = path.join(process.cwd(), '..', '..', 'src', 'types', 'index.ts');
    
    if (fs.existsSync(typesIndexPath)) {
      let content = fs.readFileSync(typesIndexPath, 'utf8');
      
      // Substituir a definição de HierarchyLevel
      const oldHierarchy = `export type HierarchyLevel = 
  | "Presidente" 
  | "Diretor" 
  | "Diretor de TI"
  | "Diretor Financeiro"
  | "Gerente"`;
      
      const newHierarchy = `export type HierarchyLevel = 
  | "Presidente" 
  | "Diretor" 
  | "Diretor de TI"
  | "Diretor Financeiro"
  | "Diretor Comercial"
  | "Gerente"`;
      
      if (content.includes(oldHierarchy)) {
        content = content.replace(oldHierarchy, newHierarchy);
        fs.writeFileSync(typesIndexPath, content);
        console.log('   ✅ src/types/index.ts atualizado');
      } else {
        console.log('   ⚠️ Padrão não encontrado em src/types/index.ts');
      }
    } else {
      console.log('   ❌ Arquivo src/types/index.ts não encontrado');
    }
    
    // 2. Atualizar src/types/user.ts
    console.log('📝 Atualizando src/types/user.ts...');
    const typesUserPath = path.join(process.cwd(), '..', '..', 'src', 'types', 'user.ts');
    
    if (fs.existsSync(typesUserPath)) {
      let content = fs.readFileSync(typesUserPath, 'utf8');
      
      const oldHierarchy = `export type HierarchyLevel = 
  | "Presidente" 
  | "Diretor" 
  | "Diretor de TI"
  | "Diretor Financeiro"
  | "Gerente"`;
      
      const newHierarchy = `export type HierarchyLevel = 
  | "Presidente" 
  | "Diretor" 
  | "Diretor de TI"
  | "Diretor Financeiro"
  | "Diretor Comercial"
  | "Gerente"`;
      
      if (content.includes(oldHierarchy)) {
        content = content.replace(oldHierarchy, newHierarchy);
        fs.writeFileSync(typesUserPath, content);
        console.log('   ✅ src/types/user.ts atualizado');
      } else {
        console.log('   ⚠️ Padrão não encontrado em src/types/user.ts');
      }
    } else {
      console.log('   ❌ Arquivo src/types/user.ts não encontrado');
    }
    
    // 3. Atualizar src/utils/hierarchyUtils.ts
    console.log('📝 Atualizando src/utils/hierarchyUtils.ts...');
    const hierarchyUtilsPath = path.join(process.cwd(), '..', '..', 'src', 'utils', 'hierarchyUtils.ts');
    
    if (fs.existsSync(hierarchyUtilsPath)) {
      let content = fs.readFileSync(hierarchyUtilsPath, 'utf8');
      
      // Atualizar array HIERARCHY_LEVELS
      const oldArray = `export const HIERARCHY_LEVELS: HierarchyLevel[] = [
  "Presidente",
  "Diretor", 
  "Diretor de TI",
  "Diretor Financeiro",
  "Gerente",`;
      
      const newArray = `export const HIERARCHY_LEVELS: HierarchyLevel[] = [
  "Presidente",
  "Diretor", 
  "Diretor de TI",
  "Diretor Financeiro",
  "Diretor Comercial",
  "Gerente",`;
      
      if (content.includes(oldArray)) {
        content = content.replace(oldArray, newArray);
        
        // Atualizar permissões para incluir Diretor Comercial
        content = content.replace(
          '["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Gerente", "Financeiro"]',
          '["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Financeiro"]'
        );
        
        content = content.replace(
          '["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Gerente"]',
          '["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente"]'
        );
        
        // Atualizar descrições
        const oldDescriptions = `    "Diretor Financeiro": "💰 Direciona estratégias e operações financeiras",
    "Gerente": "📋 Gerencia departamentos específicos",`;
        
        const newDescriptions = `    "Diretor Financeiro": "💰 Direciona estratégias e operações financeiras",
    "Diretor Comercial": "🛍️ Direciona estratégias e operações comerciais",
    "Gerente": "📋 Gerencia departamentos específicos",`;
        
        content = content.replace(oldDescriptions, newDescriptions);
        
        // Atualizar cores
        const oldColors = `    "Diretor Financeiro": "bg-green-600 text-white",
    "Gerente": "bg-green-500 text-white",`;
        
        const newColors = `    "Diretor Financeiro": "bg-green-600 text-white",
    "Diretor Comercial": "bg-blue-700 text-white",
    "Gerente": "bg-green-500 text-white",`;
        
        content = content.replace(oldColors, newColors);
        
        fs.writeFileSync(hierarchyUtilsPath, content);
        console.log('   ✅ src/utils/hierarchyUtils.ts atualizado');
      } else {
        console.log('   ⚠️ Padrão não encontrado em src/utils/hierarchyUtils.ts');
      }
    } else {
      console.log('   ❌ Arquivo src/utils/hierarchyUtils.ts não encontrado');
    }
    
    console.log('\n🎉 "Diretor Comercial" adicionado ao sistema!\n');
    
    // 4. Mostrar resumo das permissões
    console.log('📋 PERMISSÕES DO NOVO CARGO "DIRETOR COMERCIAL":');
    console.log('   ✅ Colaboradores (gestão)');
    console.log('   ✅ ChatBot');
    console.log('   ❌ Financeiro (não tem acesso)');
    console.log('   ❌ Relatórios (não tem acesso)');
    console.log('   ✅ Configurações');
    console.log('   ✅ Pode gerenciar hierarquias inferiores');
    console.log('   ✅ Pode aprovar solicitações de despesas\n');
    
    console.log('🔄 PRÓXIMOS PASSOS:');
    console.log('1. Reinicie o servidor de desenvolvimento (npm run dev)');
    console.log('2. Teste criando um novo colaborador com cargo "Diretor Comercial"');
    console.log('3. Ou promova um colaborador existente para este cargo\n');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar Diretor Comercial:', error);
  }
}

// Executar o script
addDirectorComercial(); 