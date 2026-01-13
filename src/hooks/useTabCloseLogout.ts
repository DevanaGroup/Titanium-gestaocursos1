import { useEffect } from 'react';
import { auth } from '@/config/firebase';

// Sistema mais robusto de controle de logout intencional
(window as any).intentionalLogout = false;
(window as any).administrativeOperation = false;
(window as any).collaboratorCreationInProgress = false;

export const useTabCloseLogout = () => {
  useEffect(() => {
    let isPageUnloading = false;
    let isReloading = false;
    let beforeUnloadTriggered = false;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      beforeUnloadTriggered = true;
      
      // Verificar se há operação administrativa em andamento
      if ((window as any).administrativeOperation || 
          (window as any).collaboratorCreationInProgress || 
          (window as any).intentionalLogout) {
        console.log('🔒 Operação administrativa em andamento - logout automático desabilitado');
        return;
      }

      // Marcar que o evento beforeunload foi chamado
      sessionStorage.setItem('beforeUnloadTime', Date.now().toString());
      
      // IMPORTANTE: NÃO fazer logout no beforeunload para evitar logout durante recarregamentos
      console.log('🔄 beforeunload detectado - aguardando confirmação se é fechamento real');
    };

    const handleVisibilityChange = () => {
      // Verificar se há operações administrativas em andamento
      if ((window as any).administrativeOperation || 
          (window as any).collaboratorCreationInProgress || 
          (window as any).intentionalLogout) {
        console.log('🔒 Operação administrativa em andamento - ignorando mudança de visibilidade');
        return;
      }

      // Detecta quando a guia fica oculta (mas não faz logout imediatamente)
      if (document.visibilityState === 'hidden' && !isPageUnloading && !isReloading) {
        // Apenas marca o tempo que ficou oculta, mas NÃO faz logout imediato
        sessionStorage.setItem('tabHidden', Date.now().toString());
        console.log('Guia ficou oculta - marcando timestamp para controle de timeout');
      }
    };

    const handlePageHide = () => {
      // Verificar se há operações administrativas em andamento
      if ((window as any).administrativeOperation || 
          (window as any).collaboratorCreationInProgress || 
          (window as any).intentionalLogout) {
        console.log('🔒 Operação administrativa em andamento - ignorando pagehide');
        return;
      }

      // Verificar se beforeunload foi chamado recentemente (últimos 2 segundos)
      const beforeUnloadTime = sessionStorage.getItem('beforeUnloadTime');
      if (beforeUnloadTime) {
        const timeDiff = Date.now() - parseInt(beforeUnloadTime);
        if (timeDiff < 2000) { // Menos de 2 segundos - provavelmente é recarregamento
          console.log('🔄 pagehide logo após beforeunload - provavelmente recarregamento, ignorando logout');
          return;
        }
      }

      // Verificar tipo de navegação
      const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
      if (navigationType === 'reload') {
        console.log('🔄 Navegação tipo reload detectada - não fazendo logout');
        return;
      }

      isPageUnloading = true;
      
      try {
        // Logout final quando a página é realmente fechada
        auth.signOut();
        
        // Limpa todos os dados da sessão - mas preserva o beforeUnloadTime para debug
        const debugInfo = sessionStorage.getItem('beforeUnloadTime');
        localStorage.clear();
        sessionStorage.clear();
        if (debugInfo) {
          sessionStorage.setItem('lastLogoutReason', 'pagehide');
          sessionStorage.setItem('lastBeforeUnload', debugInfo);
        }
        
        console.log('🚪 Logout executado no evento pagehide');
      } catch (error) {
        console.error('Erro ao fazer logout no pagehide:', error);
      }
    };

    const handleFocus = () => {
      // Reset das flags quando a página ganha foco novamente
      isPageUnloading = false;
      isReloading = false;
      
      // NÃO resetar as flags administrativas automaticamente - apenas se não houver operações em andamento
      if (!(window as any).administrativeOperation && !(window as any).collaboratorCreationInProgress) {
        (window as any).intentionalLogout = false;
      }
      
      // Quando a guia volta a ter foco, verifica se ficou oculta por muito tempo
      const tabHidden = sessionStorage.getItem('tabHidden');
      if (tabHidden && 
          !(window as any).administrativeOperation && 
          !(window as any).collaboratorCreationInProgress) {
        const hiddenTime = parseInt(tabHidden);
        const currentTime = Date.now();
        
        // Se ficou oculta por mais de 5 minutos, força o logout
        if (currentTime - hiddenTime > 5 * 60 * 1000) {
          try {
            auth.signOut();
            window.location.href = '/login';
            console.log('Logout executado após período prolongado oculto (>5 minutos)');
          } catch (error) {
            console.error('Erro ao forçar logout após período oculto:', error);
          }
        } else {
          console.log('Guia voltou ao foco - sessão mantida (tempo oculto menor que 5 minutos)');
        }
        
        // Remove a flag
        sessionStorage.removeItem('tabHidden');
      }
    };

    // Detectar recarregamento através de teclas
    const handleKeyDown = (event: KeyboardEvent) => {
      // F5 ou Ctrl+R ou Cmd+R
      if (event.key === 'F5' || 
          (event.ctrlKey && event.key === 'r') || 
          (event.metaKey && event.key === 'r')) {
        isReloading = true;
        console.log('Recarregamento detectado - logout não será executado');
      }
    };

    // Event listener para detectar quando a página está carregando
    const handleLoad = () => {
      // Verificar se foi um recarregamento
      const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
      if (navigationType === 'reload') {
        console.log('🔄 Página recarregada - sessão mantida ativa');
        // Limpar flags de recarregamento após confirmação
        sessionStorage.removeItem('beforeUnloadTime');
      }
      
      // Reset das flags após carregamento (mas não as administrativas)
      isPageUnloading = false;
      isReloading = false;
      beforeUnloadTriggered = false;
      
      // Apenas reset da flag intentionalLogout se não houver operações administrativas
      if (!(window as any).administrativeOperation && !(window as any).collaboratorCreationInProgress) {
        (window as any).intentionalLogout = false;
      }
      
      // Debug: mostrar informações sobre último logout se houve
      const lastLogout = sessionStorage.getItem('lastLogoutReason');
      if (lastLogout) {
        console.log('📊 Debug - Último logout foi por:', lastLogout);
        sessionStorage.removeItem('lastLogoutReason');
        sessionStorage.removeItem('lastBeforeUnload');
      }
    };

    // Adicionar os event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('load', handleLoad);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup: remover os event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}; 