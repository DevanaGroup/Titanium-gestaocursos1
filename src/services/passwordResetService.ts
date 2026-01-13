/**
 * Serviço para recuperação de senha
 */

import { sendPasswordResetEmail as firebaseSendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/config/firebase';

/**
 * Envia email de recuperação de senha usando Firebase Auth
 * @param email - Email do usuário
 * @returns Promise<boolean> - True se o email foi enviado com sucesso
 */
export const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
  try {
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Email inválido');
    }
    
    // Enviar email de recuperação usando Firebase Auth
    await firebaseSendPasswordResetEmail(auth, email);
    
    console.log(`📧 Email de recuperação enviado para: ${email}`);
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao enviar email de recuperação:', error);
    
    // Tratar erros específicos do Firebase
    if (error.code === 'auth/user-not-found') {
      throw new Error('Nenhuma conta encontrada com este email');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Email inválido');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Muitas tentativas. Tente novamente mais tarde');
    } else {
      throw new Error('Erro ao enviar email de recuperação. Tente novamente');
    }
  }
};

/**
 * Simula a validação de token de recuperação
 * @param token - Token de recuperação
 * @param email - Email do usuário
 * @returns Promise<boolean> - True se o token é válido
 */
export const validateResetToken = async (token: string, email: string): Promise<boolean> => {
  try {
    // Simular delay de validação
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simular validação de token (em produção, validaria contra o banco de dados)
    if (token === 'abc123' && email) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    return false;
  }
};

/**
 * Simula a redefinição de senha
 * @param token - Token de recuperação
 * @param email - Email do usuário
 * @param newPassword - Nova senha
 * @returns Promise<boolean> - True se a senha foi redefinida com sucesso
 */
export const resetPassword = async (token: string, email: string, newPassword: string): Promise<boolean> => {
  try {
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simular validação de token
    const isValidToken = await validateResetToken(token, email);
    if (!isValidToken) {
      throw new Error('Token inválido ou expirado');
    }
    
    // Simular validação de senha
    if (newPassword.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres');
    }
    
    // Simular atualização da senha
    console.log(`🔐 Senha redefinida para: ${email}`);
    console.log(`🔑 Nova senha: ${newPassword}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao redefinir senha:', error);
    throw error;
  }
};
