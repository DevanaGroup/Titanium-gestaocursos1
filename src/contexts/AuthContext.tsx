import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

interface AuthContextType {
  userData: {
    uid: string;
    displayName: string;
    email: string;
  } | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [userData, setUserData] = useState<AuthContextType['userData']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Verificar se o email é válido para este projeto
          const userEmail = user.email || '';
          console.log('🔍 Verificando usuário logado:', userEmail);

          // Em produção: restringir a domínios autorizados. Em desenvolvimento: permitir qualquer email.
          const isDev = import.meta.env.DEV;
          const blockedDomain = userEmail.includes('belgos');
          const allowedDomain = userEmail.includes('@devana.com.br') || userEmail.includes('@titanium') || userEmail.includes('@cerrado');
          const unauthorized = blockedDomain || (!isDev && userEmail && !allowedDomain);

          if (unauthorized) {
            console.warn('⚠️ Conta não autorizada detectada:', userEmail);
            console.log('🔓 Fazendo logout automático...');
            await auth.signOut();
            setUserData(null);
            setLoading(false);
            return;
          }
          
          // Buscar dados do usuário na coleção users
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            // Mostrar apenas o firstName
            const displayName = data.firstName || user.displayName || 'Usuário';
            
            setUserData({
              uid: user.uid,
              displayName,
              email: user.email || '',
            });
          } else {
            // Fallback se não encontrar na coleção users
            setUserData({
              uid: user.uid,
              displayName: user.displayName || 'Usuário',
              email: user.email || '',
            });
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          setUserData({
            uid: user.uid,
            displayName: user.displayName || 'Usuário',
            email: user.email || '',
          });
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

