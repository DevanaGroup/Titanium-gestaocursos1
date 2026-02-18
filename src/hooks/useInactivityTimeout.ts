import { useEffect } from 'react';
import { auth } from '@/config/firebase';

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutos

const ACTIVITY_EVENTS: (keyof WindowEventMap | keyof DocumentEventMap)[] = [
  'click',
  'keydown',
  'mousemove',
  'scroll',
  'touchstart',
  'focus',
];

export const useInactivityTimeout = () => {
  useEffect(() => {
    let timeoutId: number | null = null;

    const scheduleLogout = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(async () => {
        try {
          // Marcar logout como intencional para não conflitar com outras lógicas
          (window as any).intentionalLogout = true;

          await auth.signOut();
          window.location.href = '/login';
          console.log('🚪 Logout por inatividade (> 60 minutos)');
        } catch (error) {
          console.error('Erro ao fazer logout por inatividade:', error);
        }
      }, SESSION_TIMEOUT_MS);
    };

    const handleActivity = () => {
      scheduleLogout();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      // Alguns eventos pertencem ao window, outros ao document – registrar em ambos é seguro
      window.addEventListener(eventName as any, handleActivity);
      document.addEventListener(eventName as any, handleActivity);
    });

    // Inicia o contador assim que o usuário entra em uma rota protegida
    scheduleLogout();

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName as any, handleActivity);
        document.removeEventListener(eventName as any, handleActivity);
      });
    };
  }, []);
};

