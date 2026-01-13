import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

const CleanupButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleCleanupConfirm = () => {
    setConfirmOpen(true);
  };

  const executeCleanup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao limpar dados');
      }

      toast.success('Todos os dados foram deletados com sucesso');
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      toast.error('Erro ao limpar dados');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={handleCleanupConfirm}
        disabled={isLoading}
      >
        {isLoading ? 'Limpando...' : 'Limpar Todos os Dados'}
      </Button>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={executeCleanup}
        title="⚠️ ATENÇÃO - Limpeza Total dos Dados"
        description="Tem certeza que deseja deletar TODOS os dados do sistema? Esta ação é IRREVERSÍVEL e removerá permanentemente todos os clientes, colaboradores, tarefas, documentos e demais informações. Esta operação não pode ser desfeita!"
        confirmText="SIM, DELETAR TUDO"
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
};

export default CleanupButton; 