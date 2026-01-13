import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Função para migrar tarefas com assignedToName indefinido
 * Esta função pode ser chamada manualmente pelo admin para corrigir dados antigos
 */
export async function migrateBrokenTaskNames() {
  console.log('🔧 Iniciando migração de nomes de tarefas...');
  
  try {
    // Buscar todas as tarefas
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    let updatedCount = 0;
    
    // Buscar colaboradores para referência
    const collaboratorsSnapshot = await getDocs(collection(db, 'collaborators'));
    const collaborators = collaboratorsSnapshot.docs.map(doc => ({
      uid: doc.data().uid || doc.id,
      firstName: doc.data().firstName || '',
      lastName: doc.data().lastName || '',
      email: doc.data().email || ''
    }));
    
    console.log(`📋 Encontradas ${tasksSnapshot.docs.length} tarefas para verificar`);
    
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      const assignedToName = taskData.assignedToName;
      
      // Verificar se o nome está com problema
      if (!assignedToName || 
          assignedToName === 'undefined undefined' || 
          assignedToName.includes('undefined') ||
          assignedToName.trim() === '') {
        
        console.log(`❌ Tarefa "${taskData.title}" com nome incorreto: "${assignedToName}"`);
        
        // Buscar colaborador correspondente
        const collaborator = collaborators.find(c => c.uid === taskData.assignedTo);
        let newName = 'Responsável';
        
        if (collaborator) {
          const firstName = collaborator.firstName || '';
          const lastName = collaborator.lastName || '';
          newName = `${firstName} ${lastName}`.trim() || collaborator.email || 'Colaborador';
        }
        
        // Atualizar no banco
        await updateDoc(doc(db, 'tasks', taskDoc.id), {
          assignedToName: newName
        });
        
        console.log(`✅ Tarefa "${taskData.title}" corrigida: "${assignedToName}" → "${newName}"`);
        updatedCount++;
      }
    }
    
    console.log(`🎉 Migração concluída! ${updatedCount} tarefas foram corrigidas.`);
    return { success: true, updated: updatedCount, total: tasksSnapshot.docs.length };
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

/**
 * Função para verificar quantas tarefas precisam de migração
 */
export async function checkTasksNeedingMigration() {
  try {
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    let brokenCount = 0;
    
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      const assignedToName = taskData.assignedToName;
      
      if (!assignedToName || 
          assignedToName === 'undefined undefined' || 
          assignedToName.includes('undefined') ||
          assignedToName.trim() === '') {
        brokenCount++;
      }
    }
    
    return {
      total: tasksSnapshot.docs.length,
      broken: brokenCount,
      needsMigration: brokenCount > 0
    };
    
  } catch (error) {
    console.error('Erro ao verificar tarefas:', error);
    return { total: 0, broken: 0, needsMigration: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
} 