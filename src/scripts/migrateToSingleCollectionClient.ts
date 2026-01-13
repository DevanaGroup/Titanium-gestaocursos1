import { db } from '../config/firebase-node';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  Timestamp 
} from 'firebase/firestore';

interface UserData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  hierarchyLevel: string;
  photoURL?: string;
  createdAt: any;
  updatedAt: any;
}

interface CollaboratorData {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: any;
  hierarchyLevel: string;
  phone?: string;
  address?: string;
  responsibleName?: string;
  customPermissions?: any;
  avatar?: string;
  createdAt: any;
  updatedAt: any;
}

const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp && timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date();
};

const migrateToSingleCollection = async () => {
  try {
    console.log('🚀 Iniciando migração para coleção única...');
    
    // 1. Buscar todos os documentos de 'users'
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersData: { [uid: string]: UserData } = {};
    
    usersSnapshot.forEach(docSnap => {
      const data = docSnap.data() as UserData;
      usersData[docSnap.id] = {
        ...data,
        uid: data.uid || docSnap.id
      };
    });
    
    console.log(`📄 Encontrados ${Object.keys(usersData).length} documentos em 'users'`);
    
    // 2. Buscar todos os documentos de 'collaborators'
    const collaboratorsSnapshot = await getDocs(collection(db, 'collaborators'));
    const collaboratorsData: { [uid: string]: CollaboratorData } = {};
    
    collaboratorsSnapshot.forEach(docSnap => {
      const data = docSnap.data() as CollaboratorData;
      collaboratorsData[docSnap.id] = {
        ...data,
        uid: data.uid || docSnap.id
      };
    });
    
    console.log(`👥 Encontrados ${Object.keys(collaboratorsData).length} documentos em 'collaborators'`);
    
    // 3. Criar coleção unificada
    const allUids = new Set([...Object.keys(usersData), ...Object.keys(collaboratorsData)]);
    console.log(`🔄 Total de UIDs únicos para migrar: ${allUids.size}`);
    
    let migratedCount = 0;
    let errors = 0;
    
    for (const uid of allUids) {
      try {
        const userData = usersData[uid];
        const collaboratorData = collaboratorsData[uid];
        
                 // Criar documento unificado priorizando dados da coleção 'collaborators'
        const unifiedData: any = {
          uid: uid,
          
          // Dados básicos (priorizar collaborators)
          firstName: collaboratorData?.firstName || userData?.firstName || 'Nome',
          lastName: collaboratorData?.lastName || userData?.lastName || 'Sobrenome',
          email: collaboratorData?.email || userData?.email || '',
          
          // Hierarquia (priorizar collaborators)
          hierarchyLevel: collaboratorData?.hierarchyLevel || userData?.hierarchyLevel || 'Estagiário/Auxiliar',
          
          // Dados específicos de RH (só existem em collaborators)
          birthDate: collaboratorData?.birthDate ? convertTimestamp(collaboratorData.birthDate) : new Date('1990-01-01'),
          phone: collaboratorData?.phone || '',
          address: collaboratorData?.address || '',
          responsibleName: collaboratorData?.responsibleName || '',
          
          // Avatar/foto
          avatar: collaboratorData?.avatar || userData?.photoURL || null,
          
          // Metadados
          createdAt: collaboratorData?.createdAt ? convertTimestamp(collaboratorData.createdAt) : 
                    userData?.createdAt ? convertTimestamp(userData.createdAt) : new Date(),
          updatedAt: new Date(),
          
          // Campos de controle da migração
          migratedAt: new Date(),
          sourceCollections: {
            hadUsersData: !!userData,
            hadCollaboratorsData: !!collaboratorData
          }
        };
        
        // Adicionar customPermissions apenas se existir
        if (collaboratorData?.customPermissions) {
          unifiedData.customPermissions = collaboratorData.customPermissions;
        }
        
        // Salvar na nova coleção unificada 'collaborators_unified'
        await setDoc(doc(db, 'collaborators_unified', uid), unifiedData);
        
        migratedCount++;
        console.log(`✅ Migrado ${migratedCount}/${allUids.size}: ${unifiedData.firstName} ${unifiedData.lastName} (${unifiedData.email})`);
        
      } catch (error) {
        console.error(`❌ Erro ao migrar UID ${uid}:`, error);
        errors++;
      }
    }
    
    console.log('\n📊 Resumo da migração:');
    console.log(`✅ Migrados com sucesso: ${migratedCount}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📝 Total processados: ${allUids.size}`);
    
    // 4. Verificar integridade
    console.log('\n🔍 Verificando integridade dos dados migrados...');
    const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
    console.log(`📄 Documentos na nova coleção: ${unifiedSnapshot.size}`);
    
    // Mostrar alguns exemplos
    console.log('\n📋 Exemplos de dados migrados:');
    const examples = unifiedSnapshot.docs.slice(0, 3);
    examples.forEach(docSnap => {
      const data = docSnap.data();
      console.log(`- ${data.firstName} ${data.lastName} (${data.email}) - ${data.hierarchyLevel}`);
      console.log(`  Fontes: Users=${data.sourceCollections.hadUsersData}, Collaborators=${data.sourceCollections.hadCollaboratorsData}`);
    });
    
    console.log('\n🎉 Migração concluída! Próximos passos:');
    console.log('1. ✅ Verificar os dados na nova coleção "collaborators_unified"');
    console.log('2. 🔄 Atualizar o código para usar apenas a nova coleção');
    console.log('3. 🧪 Testar todas as funcionalidades');
    console.log('4. 🗑️  Remover as coleções antigas após confirmação');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  }
};

// Executar a migração
migrateToSingleCollection().then(() => {
  console.log('✨ Script de migração finalizado!');
}).catch((error) => {
  console.error('💥 Erro fatal na migração:', error);
}); 