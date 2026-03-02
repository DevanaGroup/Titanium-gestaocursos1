import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { functions, auth } from '@/config/firebase';

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

/**
 * Login como outro usuário (impersonate) - apenas Níveis 1, 2 e 3
 */
export const loginAsUser = async (targetUserId: string): Promise<void> => {
  const fn = httpsCallable<{ targetUserId: string }, { customToken: string }>(
    functions,
    'createCustomTokenForImpersonation'
  );
  try {
    const result = await fn({ targetUserId });
    const { customToken } = result.data || {};
    if (!customToken) {
      throw new Error('Token não retornado');
    }
    await signInWithCustomToken(auth, customToken);
  } catch (err: any) {
    const msg = err?.message || err?.details || 'Erro ao fazer login como usuário';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
};

/**
 * Admin define nova senha para um usuário - apenas Níveis 1, 2 e 3
 */
export const adminUpdateUserPassword = async (targetUserId: string, newPassword: string): Promise<void> => {
  const fn = httpsCallable<{ targetUserId: string; newPassword: string }, { success: boolean }>(
    functions,
    'updateUserPassword'
  );
  try {
    const result = await fn({ targetUserId, newPassword });
    if (!result.data?.success) {
      throw new Error('Falha ao atualizar senha');
    }
  } catch (err: any) {
    const msg = err?.message || err?.details || 'Erro ao atualizar senha';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
};
