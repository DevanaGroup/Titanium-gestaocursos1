import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { db } from '@/config/firebase';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

// IDs específicos para Presidente
const PRESIDENTE_IDS = [
  'I5JVmgcrkXh6UYhkTYrhKWlutz63',
  'TyRG9NYt46Yy8TnjsBTr72YUNMK2'
];

export const HierarchyUpdateButton = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const addToLog = (message: string) => {
    setUpdateLog(prev => [...prev, message]);
  };

  const updateHierarchy = async () => {
    if (!isAdmin) {
      alert('Apenas administradores podem atualizar hierarquias');
      return;
    }

    setIsUpdating(true);
    setUpdateLog([]);

    try {
      // Buscar colaboradores da coleção unificada primeiro
      let allCollaborators: any[] = [];
      
      console.log('🔍 Buscando na coleção unificada...');
      const unifiedSnapshot = await getDocs(collection(db, 'collaborators_unified'));
      allCollaborators = unifiedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`✅ HierarchyUpdate: Usando coleção unificada - ${allCollaborators.length} colaboradores`);

      console.log(`📊 Total de colaboradores encontrados: ${allCollaborators.length}`);

      // 1. Atualizar usuários específicos para Presidente
      let presidenteCount = 0;
      for (const userId of PRESIDENTE_IDS) {
        try {
          // Atualizar apenas na coleção unificada
          await updateDoc(doc(db, 'collaborators_unified', userId), {
            hierarchyLevel: 'Presidente',
            updatedAt: new Date()
          });
          
          addToLog(`✅ Usuário ${userId} atualizado para Presidente`);
          presidenteCount++;
        } catch (error) {
          addToLog(`⚠️ Erro ao atualizar usuário ${userId}: ${error}`);
        }
      }
      
      // 2. Atualizar outros colaboradores para Estagiário/Auxiliar
      let estagiarioCount = 0;
      
      // Atualizar todos os colaboradores que não são presidentes
      for (const collaborator of allCollaborators) {
        if (!PRESIDENTE_IDS.includes(collaborator.id)) {
          try {
            // Atualizar apenas na coleção unificada
            await updateDoc(doc(db, 'collaborators_unified', collaborator.id), {
              hierarchyLevel: 'Estagiário/Auxiliar',
              updatedAt: new Date()
            });
            
            estagiarioCount++;
            addToLog(`✅ Colaborador ${collaborator.firstName} ${collaborator.lastName} atualizado`);
          } catch (error) {
            addToLog(`⚠️ Erro ao atualizar colaborador ${collaborator.id}: ${error}`);
          }
        }
      }
      
      addToLog('🎉 Atualização da hierarquia concluída!');
      addToLog('📋 Resumo:');
      addToLog(`- ${presidenteCount} usuários definidos como Presidente`);
      addToLog(`- ${estagiarioCount} usuários definidos como Estagiário/Auxiliar`);
      
      toast.success('Hierarquia atualizada com sucesso!');
      
    } catch (error) {
      addToLog(`❌ Erro durante a atualização: ${error}`);
      toast.error('Erro ao atualizar hierarquia');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🔄 Atualização da Hierarquia Organizacional</CardTitle>
        <CardDescription>
          Atualize a hierarquia de todos os usuários para o novo sistema de 9 níveis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">O que será atualizado:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Usuários específicos serão promovidos a <strong>Presidente</strong></li>
            <li>• Demais usuários serão definidos como <strong>Estagiário/Auxiliar</strong></li>
            <li>• Novos níveis hierárquicos disponíveis para criação futura</li>
          </ul>
        </div>
        
        <Button 
          onClick={updateHierarchy} 
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Atualizando Hierarquia...
            </>
          ) : (
            'Atualizar Hierarquia Agora'
          )}
        </Button>
        
        {updateLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Log de Atualização</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-40 overflow-y-auto text-xs font-mono">
                {updateLog.map((log, index) => (
                  <div key={index} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}; 