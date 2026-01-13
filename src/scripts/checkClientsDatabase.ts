import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

// Simular função de permissão
const hasPermission = (userLevel: string, permission: string): boolean => {
  const canManageAll = ["Presidente", "Diretor", "Diretor de TI", "Diretor Financeiro", "Diretor Comercial", "Gerente", "Financeiro"].includes(userLevel);
  
  switch (permission) {
    case 'manage_department':
      return canManageAll;
    default:
      return canManageAll;
  }
};

async function checkClientsDatabase() {
  try {
    console.log('🔍 VERIFICANDO BASE DE DADOS DE CLIENTES\n');
    
    // 1. Verificar se existem clientes na coleção
    console.log('📊 Verificando coleção "clients"...');
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const clients = clientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
    
    console.log(`📈 Total de clientes encontrados: ${clients.length}\n`);
    
    if (clients.length === 0) {
      console.log('❌ NENHUM CLIENTE ENCONTRADO NA BASE DE DADOS\n');
      console.log('💡 POSSÍVEIS SOLUÇÕES:');
      console.log('1. Criar clientes de teste');
      console.log('2. Importar dados de clientes');
      console.log('3. Verificar se os dados estão em outra coleção\n');
      
      // Verificar outras coleções relacionadas
      console.log('🔍 Verificando outras coleções relacionadas...');
      
      // Verificar financial_clients
      const financialClientsSnapshot = await getDocs(collection(db, 'financial_clients'));
      console.log(`💰 financial_clients: ${financialClientsSnapshot.docs.length} documentos`);
      
      // Verificar prospects
      const prospectsSnapshot = await getDocs(collection(db, 'prospects'));
      console.log(`🎯 prospects: ${prospectsSnapshot.docs.length} documentos`);
      
      return;
    }
    
    // 2. Mostrar detalhes dos clientes encontrados
    console.log('📋 DETALHES DOS CLIENTES ENCONTRADOS:\n');
    
    clients.forEach((client, index) => {
      console.log(`${index + 1}. 🏢 ${client.name || 'Nome não definido'}`);
      console.log(`   📁 Projeto: ${client.project || 'Não definido'}`);
      console.log(`   📊 Status: ${client.status || 'Não definido'}`);
      console.log(`   👤 Atribuído a: ${client.assignedToName || 'Não atribuído'} (ID: ${client.assignedTo || 'N/A'})`);
      console.log(`   📧 Email: ${client.email || 'Não definido'}`);
      console.log(`   📞 Telefone: ${client.phone || 'Não definido'}`);
      console.log(`   🆔 ID: ${client.id}`);
      console.log('');
    });
    
    // 3. Verificar colaboradores e suas permissões
    console.log('👥 VERIFICANDO COLABORADORES E SUAS PERMISSÕES:\n');
    
    const collaboratorsSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    const collaborators = collaboratorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
    
    console.log(`👤 Total de colaboradores: ${collaborators.length}\n`);
    
    collaborators.forEach((collab, index) => {
      const fullName = `${collab.firstName} ${collab.lastName}`.trim();
      const role = collab.hierarchyLevel;
      const canViewAll = hasPermission(role, 'manage_department');
      
      console.log(`${index + 1}. 👤 ${fullName} (${collab.email})`);
      console.log(`   🏷️ Cargo: ${role}`);
      console.log(`   🔑 Pode ver todos os clientes: ${canViewAll ? '✅ SIM' : '❌ NÃO'}`);
      
      if (!canViewAll) {
        // Verificar quantos clientes estão atribuídos a este usuário
        const assignedClients = clients.filter(client => client.assignedTo === collab.id);
        console.log(`   📊 Clientes atribuídos: ${assignedClients.length}`);
        
        if (assignedClients.length > 0) {
          assignedClients.forEach(client => {
            console.log(`      • ${client.name} - ${client.project}`);
          });
        }
      }
      
      console.log('');
    });
    
    // 4. Análise de atribuições
    console.log('🎯 ANÁLISE DE ATRIBUIÇÕES:\n');
    
    const unassignedClients = clients.filter(client => !client.assignedTo);
    const assignedClients = clients.filter(client => client.assignedTo);
    
    console.log(`📊 Clientes não atribuídos: ${unassignedClients.length}`);
    console.log(`📊 Clientes atribuídos: ${assignedClients.length}\n`);
    
    if (unassignedClients.length > 0) {
      console.log('⚠️ CLIENTES NÃO ATRIBUÍDOS:');
      unassignedClients.forEach(client => {
        console.log(`   • ${client.name} - ${client.project}`);
      });
      console.log('');
    }
    
    // 5. Verificar se existem IDs órfãos (atribuídos a usuários que não existem)
    const activeUserIds = collaborators.map(collab => collab.id);
    const orphanedClients = assignedClients.filter(client => 
      client.assignedTo && !activeUserIds.includes(client.assignedTo)
    );
    
    if (orphanedClients.length > 0) {
      console.log('🚨 CLIENTES COM ATRIBUIÇÕES ÓRFÃS:');
      orphanedClients.forEach(client => {
        console.log(`   • ${client.name} - atribuído a ID inexistente: ${client.assignedTo}`);
      });
      console.log('');
    }
    
    // 6. Sugestões
    console.log('💡 DIAGNÓSTICO E SUGESTÕES:\n');
    
    const presidentes = collaborators.filter(collab => collab.hierarchyLevel === 'Presidente');
    
    if (presidentes.length > 0) {
      console.log('✅ PRESIDENTES ENCONTRADOS (devem ver todos os clientes):');
      presidentes.forEach(pres => {
        console.log(`   • ${pres.firstName} ${pres.lastName} (${pres.email})`);
        console.log(`     🆔 UID: ${pres.id}`);
      });
      console.log('');
    }
    
    if (clients.length > 0 && presidentes.length > 0) {
      console.log('🎯 TESTE RECOMENDADO:');
      console.log('1. Faça login como presidente');
      console.log('2. Acesse a página de Clientes');
      console.log('3. Verifique se aparecem todos os clientes');
      console.log('4. Se não aparecer, verifique o console do browser para logs de erro\n');
    }
    
    if (unassignedClients.length > 0) {
      console.log('🔧 AÇÃO RECOMENDADA:');
      console.log('Atribuir os clientes não atribuídos a colaboradores específicos ou deixá-los visíveis para gestores\n');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  }
}

// Executar a verificação
checkClientsDatabase(); 