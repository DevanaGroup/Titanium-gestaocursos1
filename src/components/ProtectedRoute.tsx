import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useTabCloseLogout } from '@/hooks/useTabCloseLogout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute = ({ children, redirectTo = '/login' }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();
  
  // Ativa o logout automático quando a guia é fechada
  useTabCloseLogout();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // 🔒 VERIFICAR SE HÁ OPERAÇÃO ADMINISTRATIVA EM ANDAMENTO
      const isAdministrativeOperation = (window as any).administrativeOperation || 
                                       (window as any).collaboratorCreationInProgress || 
                                       (window as any).intentionalLogout;

      if (user) {
        setIsAuthenticated(true);
      } else {
        // ⚠️ SÓ NAVEGAR PARA LOGIN SE NÃO HOUVER OPERAÇÃO ADMINISTRATIVA
        if (!isAdministrativeOperation) {
          console.log('🚪 Usuário deslogado - redirecionando para login');
          setIsAuthenticated(false);
          navigate(redirectTo);
        } else {
          console.log('🔒 Logout temporário durante operação administrativa - mantendo usuário na página');
          // Não alterar o estado de autenticação durante operações administrativas
        }
      }
    });

    return () => unsubscribe();
  }, [navigate, redirectTo]);

  // Mostra carregamento enquanto verifica autenticação
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cerrado-green1 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, não renderiza nada (a navegação já foi feita)
  if (!isAuthenticated) {
    return null;
  }

  // Se estiver autenticado, renderiza os filhos
  return <>{children}</>;
}; 