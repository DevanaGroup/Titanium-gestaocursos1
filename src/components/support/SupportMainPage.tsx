import React, { useState, useEffect } from 'react';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { SupportModernInterface } from './SupportModernInterface';
import { SupportModernAdminDashboard } from './SupportModernAdminDashboard';

export const SupportMainPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        try {
          const userDoc = await getDoc(doc(db, 'collaborators_unified', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.hierarchyLevel || '');
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        }
      } else {
        setCurrentUser(null);
        setUserRole('');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Verificar se é admin
  const isAdmin = ['Diretor de TI', 'Presidente'].includes(userRole);

  if (isAdmin) {
    return <SupportModernAdminDashboard />;
  }

  return <SupportModernInterface />;
}; 