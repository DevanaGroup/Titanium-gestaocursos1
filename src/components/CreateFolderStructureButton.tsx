import React from 'react';
import { Button } from './ui/button';
import { createDefaultFolderStructure } from '../services/folderService';
import { toast } from 'sonner';

interface CreateFolderStructureButtonProps {
  clientId: string;
  className?: string;
  onSuccess?: () => Promise<void>;
}

export function CreateFolderStructureButton({ clientId, className, onSuccess }: CreateFolderStructureButtonProps) {
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreateStructure = async () => {
    try {
      setIsCreating(true);
      const folders = await createDefaultFolderStructure(clientId);
      
      // Se retornou pastas mas não criou novas (já existiam)
      if (folders && folders.length > 0) {
        toast.info('Cliente já possui estrutura de pastas', {
          description: 'Use o botão "Resetar Estrutura" para recriar as pastas se necessário.'
        });
      } else {
        toast.success('Estrutura de pastas criada com sucesso!');
      }

      // Chamar callback de sucesso se existir
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      console.error('Erro ao criar estrutura de pastas:', error);
      toast.error('Erro ao criar estrutura de pastas. Tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleCreateStructure}
      disabled={isCreating}
      className={className}
    >
      {isCreating ? 'Criando estrutura...' : 'Criar estrutura de pastas'}
    </Button>
  );
} 