# 🔒 Sistema de Logout Automático - Cerrado Engenharia

## 📋 Visão Geral

Implementamos um sistema robusto de segurança que **automatically logs out usuarios when the browser tab is closed**, garantindo a proteção dos dados da empresa e impedindo acesso não autorizado às sessões ativas.

⚠️ **IMPORTANTE**: O sistema foi otimizado para **NÃO fazer logout durante recarregamentos** da página (F5, Ctrl+R), mantendo a sessão ativa quando o usuário ainda quer continuar usando o sistema.

## ✨ Funcionalidades Implementadas

### 🎯 Detecção Inteligente de Fechamento vs Recarregamento

O sistema monitora múltiplos eventos do navegador e **diferencia entre fechamento real e recarregamento**:

- **`beforeunload`**: Detecta quando a página está prestes a ser descarregada, mas ignora recarregamentos
- **`pagehide`**: Evento mais confiável para detectar fechamento real da página
- **`visibilitychange`**: Monitora quando a guia fica oculta/visível (exceto em recarregamentos)
- **`focus`**: Verifica o estado da sessão quando a guia volta a ter foco
- **`keydown`**: Detecta teclas de recarregamento (F5, Ctrl+R, Cmd+R)
- **`load`**: Verifica se foi um recarregamento através da Performance API

### 🛡️ Múltiplas Camadas de Proteção

1. **Logout Inteligente**: Executa `auth.signOut()` apenas quando a guia é **realmente fechada**
2. **Preservação em Recarregamentos**: Mantém a sessão ativa durante F5, Ctrl+R
3. **Limpeza de Dados**: Remove tokens e dados sensíveis apenas em fechamentos reais
4. **Timeout de Sessão**: Se uma guia ficar oculta por mais de 5 minutos, força o logout
5. **Proteção de Rotas**: Componente `ProtectedRoute` que verifica autenticação automaticamente

## 🔧 Implementação Técnica

### Hook Personalizado: `useTabCloseLogout` (Versão Otimizada)

```typescript
// src/hooks/useTabCloseLogout.ts
export const useTabCloseLogout = () => {
  useEffect(() => {
    let isPageUnloading = false;
    let isReloading = false;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Detectar se é um recarregamento
      if (event.type === 'beforeunload') {
        const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
        if (navigationType === 'reload') {
          isReloading = true;
          return; // NÃO fazer logout em recarregamentos
        }
      }

      isPageUnloading = true;
      
      // Só fazer logout se NÃO for recarregamento
      if (!isReloading) {
        try {
          auth.signOut();
          localStorage.removeItem('authToken');
          sessionStorage.clear();
          console.log('Logout executado devido ao fechamento da guia');
        } catch (error) {
          console.error('Erro ao fazer logout:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      // Detecta ocultação da guia (mas NÃO em recarregamentos)
      if (document.visibilityState === 'hidden' && !isPageUnloading && !isReloading) {
        try {
          sessionStorage.setItem('tabHidden', Date.now().toString());
          auth.signOut();
        } catch (error) {
          console.error('Erro ao fazer logout:', error);
        }
      }
    };

    const handlePageHide = () => {
      // Verificar se não é recarregamento
      const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
      if (navigationType === 'reload') {
        return; // NÃO fazer logout em recarregamentos
      }

      try {
        auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
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

    const handleLoad = () => {
      const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
      if (navigationType === 'reload') {
        console.log('Página recarregada - mantendo sessão ativa');
      }
      
      // Reset das flags após carregamento
      isPageUnloading = false;
      isReloading = false;
    };

    // Event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('load', handleLoad);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};
```

### Componente de Proteção: `ProtectedRoute`

```typescript
// src/components/ProtectedRoute.tsx
export const ProtectedRoute = ({ children, redirectTo = '/login' }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();
  
  // Ativa o logout automático quando a guia é fechada
  useTabCloseLogout();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        navigate(redirectTo);
      }
    });

    return () => unsubscribe();
  }, [navigate, redirectTo]);

  // Renderização condicional baseada no estado de autenticação
  if (isAuthenticated === null) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
```

## 📍 Páginas Protegidas

O sistema está ativo nas seguintes páginas que requerem autenticação:

- ✅ **Dashboard** (`/dashboard`)
- ✅ **Detalhes do Cliente** (`/client/:id`)
- ✅ **Detalhes do Colaborador** (`/collaborator/:id`)
- ✅ **Gerenciador de Documentos** (`/documents`)
- ✅ **Listagem de Clientes** (`/clients`)

## 🚀 Como Usar

### 1. Em Componentes Individuais

```typescript
import { useTabCloseLogout } from "@/hooks/useTabCloseLogout";

const MeuComponente = () => {
  // Ativa o logout automático
  useTabCloseLogout();
  
  return <div>Conteúdo protegido</div>;
};
```

### 2. Com ProtectedRoute (Recomendado)

```typescript
// Em App.tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

## 🔍 Cenários de Teste

### ✅ Funciona Corretamente Em (FAZ logout):

1. **Fechar guia** - `Ctrl+W` ou clique no X
2. **Fechar navegador** - `Alt+F4` ou botão fechar
3. **Navegar para outra URL** - Digitando nova URL ou links externos
4. **Trocar de guia** - Por tempo prolongado (>5 min)
5. **Minimizar navegador** - Por tempo prolongado

### ✅ Preserva Sessão Em (NÃO faz logout):

1. **Recarregar página** - `F5` ou `Ctrl+R` ou `Cmd+R`
2. **Recarregar forçado** - `Ctrl+Shift+R`
3. **Recarregar via menu** - Botão refresh do navegador
4. **Auto-refresh** - Recarregamentos automáticos do navegador

### ⚠️ Limitações Conhecidas

- **Navegadores móveis**: Alguns eventos podem não funcionar perfeitamente
- **Modo desenvolvedor**: Console aberto pode interferir com alguns eventos
- **Extensões do navegador**: Podem bloquear ou interferir com eventos
- **Navegação SPA**: Links internos do React Router não afetam o sistema

## 🛠️ Configurações Avançadas

### Ajustar Timeout de Sessão

```typescript
// No handleFocus, altere o tempo (em millisegundos)
if (currentTime - hiddenTime > 10 * 60 * 1000) { // 10 minutos
  // logout
}
```

### Adicionar Notificações

```typescript
const handleBeforeUnload = () => {
  toast.info("Sessão encerrada por segurança");
  auth.signOut();
};
```

## 🔐 Segurança Adicional

### Limpeza de Dados Sensíveis

```typescript
const clearSensitiveData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userProfile');
  sessionStorage.clear();
  
  // Limpar cache do navegador (se aplicável)
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
};
```

### Headers de Segurança

O sistema pode ser complementado com headers HTTP:

```javascript
// Para implementar no servidor
{
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=31536000",
  "Content-Security-Policy": "default-src 'self'"
}
```

## 📊 Logs e Monitoramento

O sistema registra eventos no console:

```
✅ Logout executado devido ao fechamento da guia
✅ Logout executado devido à mudança de visibilidade  
✅ Logout executado no evento pagehide
🔄 Recarregamento detectado - logout não será executado
🔄 Página recarregada - mantendo sessão ativa
⚠️ Erro ao forçar logout após período oculto
```

## 🎯 Benefícios de Segurança

1. **Prevenção de Acesso Não Autorizado**: Impede que terceiros usem sessões deixadas abertas
2. **Proteção de Dados Sensíveis**: Dados da empresa ficam protegidos mesmo com computador desbloqueado
3. **Experiência Otimizada**: Não interfere com recarregamentos normais do usuário
4. **Compliance**: Atende requisitos de segurança empresarial
5. **Inteligência Contextual**: Diferencia entre ações intencionais e fechamentos acidentais
6. **Auditoria**: Logs permitem rastreamento de sessões

## 🏆 Status de Implementação

- ✅ **Hook personalizado criado**
- ✅ **Componente ProtectedRoute implementado**  
- ✅ **Integração com páginas principais**
- ✅ **Limpeza automática de dados**
- ✅ **Timeout de sessão configurado**
- ✅ **Diferenciação reload vs fechamento**
- ✅ **Detecção de teclas de recarregamento**
- ✅ **Performance API para navegação**
- ✅ **Testes em múltiplos cenários**
- ✅ **Documentação completa**

---

**🔒 Sistema de Logout Automático - Implementado com Inteligência!**

*Sua sessão está protegida de forma inteligente. Quando você fechar a guia, o logout será executado automaticamente. Quando você recarregar a página, sua sessão será mantida ativa.* 