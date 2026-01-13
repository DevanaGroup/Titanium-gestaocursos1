import admin from 'firebase-admin';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializa o Firebase Admin se ainda não estiver inicializado
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const auth = getAuth();
const db = getFirestore();

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

const migrateToSingleCollection = async () => {
  try {
    console.log('🚀 Iniciando migração para coleção única...');
    
    // 1. Buscar todos os documentos de 'users'
    const usersSnapshot = await db.collection('users').get();
    const usersData: { [uid: string]: UserData } = {};
    
    usersSnapshot.forEach(doc => {
      usersData[doc.id] = doc.data() as UserData;
    });
    
    console.log(`📄 Encontrados ${Object.keys(usersData).length} documentos em 'users'`);
    
    // 2. Buscar todos os documentos de 'collaborators'
    const collaboratorsSnapshot = await db.collection('collaborators').get();
    const collaboratorsData: { [uid: string]: CollaboratorData } = {};
    
    collaboratorsSnapshot.forEach(doc => {
      collaboratorsData[doc.id] = doc.data() as CollaboratorData;
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
        const unifiedData = {
          uid: uid,
          
          // Dados básicos (priorizar collaborators)
          firstName: collaboratorData?.firstName || userData?.firstName || 'Nome',
          lastName: collaboratorData?.lastName || userData?.lastName || 'Sobrenome',
          email: collaboratorData?.email || userData?.email || '',
          
          // Dados do sistema de autenticação
          displayName: userData?.displayName || `${collaboratorData?.firstName || 'Nome'} ${collaboratorData?.lastName || 'Sobrenome'}`,
          
          // Hierarquia (priorizar collaborators)
          hierarchyLevel: collaboratorData?.hierarchyLevel || userData?.hierarchyLevel || 'Estagiário/Auxiliar',
          
          // Dados específicos de RH (só existem em collaborators)
          birthDate: collaboratorData?.birthDate || new Date('1990-01-01'),
          phone: collaboratorData?.phone || '',
          address: collaboratorData?.address || '',
          responsibleName: collaboratorData?.responsibleName || '',
          customPermissions: collaboratorData?.customPermissions || undefined,
          
          // Avatar/foto
          avatar: collaboratorData?.avatar || userData?.photoURL || null,
          photoURL: userData?.photoURL || collaboratorData?.avatar || null,
          
          // Metadados
          createdAt: collaboratorData?.createdAt || userData?.createdAt || new Date(),
          updatedAt: new Date(),
          
          // Campos de controle da migração
          migratedAt: new Date(),
          sourceCollections: {
            hadUsersData: !!userData,
            hadCollaboratorsData: !!collaboratorData
          }
        };
        
        // Salvar na nova coleção unificada 'collaborators_unified'
        await db.collection('collaborators_unified').doc(uid).set(unifiedData);
        
        migratedCount++;
        console.log(`✅ Migrado ${migratedCount}/${allUids.size}: ${unifiedData.firstName} ${unifiedData.lastName}`);
        
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
    const unifiedSnapshot = await db.collection('collaborators_unified').get();
    console.log(`📄 Documentos na nova coleção: ${unifiedSnapshot.size}`);
    
    // Mostrar alguns exemplos
    console.log('\n📋 Exemplos de dados migrados:');
    unifiedSnapshot.docs.slice(0, 3).forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.firstName} ${data.lastName} (${data.email}) - ${data.hierarchyLevel}`);
      console.log(`  Fontes: Users=${data.sourceCollections.hadUsersData}, Collaborators=${data.sourceCollections.hadCollaboratorsData}`);
    });
    
    console.log('\n🎉 Migração concluída! Agora você pode:');
    console.log('1. Testar a nova coleção "collaborators_unified"');
    console.log('2. Atualizar o código para usar apenas uma coleção');
    console.log('3. Após verificar, fazer backup e remover as coleções antigas');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    process.exit(0);
  }
};

migrateToSingleCollection(); 