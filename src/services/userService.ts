import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

/**
 * Hard delete de usuário: remove da coleção users e do Firebase Auth.
 * Tarefas relacionadas NÃO são deletadas (preservação de histórico).
 * Usado para Professores e Colaboradores.
 */
export const performHardDeleteUser = async (userId: string): Promise<void> => {
  const deleteUserFn = httpsCallable<{ userId: string }, { success: boolean }>(
    functions,
    'deleteUserPermanently'
  );
  const result = await deleteUserFn({ userId });
  if (!result.data?.success) {
    throw new Error('Falha ao remover usuário permanentemente');
  }
};
