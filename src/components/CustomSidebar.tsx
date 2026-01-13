import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import Logo from '@/components/Logo';
import { 
  Home, Users, User, Calendar, 
  KanbanSquare, FileText, Receipt,
  Settings, HelpCircle, GraduationCap,
  FolderOpen, ChevronDown, X, Archive
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { auth, db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { hasPermission, hasFinancialAccess, hasSettingsAccess, getLevelNumber } from "@/utils/hierarchyUtils";
import { HierarchyLevel } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetOverlay, SheetPortal } from "@/components/ui/sheet";
import * as SheetPrimitive from "@radix-ui/react-dialog";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  requiresPermission?: boolean;
  permission?: string;
  hasSubmenu?: boolean;
}

interface CustomSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const CustomSidebar: React.FC<CustomSidebarProps> = ({ activeTab, onTabChange, mobileOpen, onMobileOpenChange }) => {
  const { isCollapsed } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [userRole, setUserRole] = useState<HierarchyLevel>('Nível 5');
  const [isLoading, setIsLoading] = useState(true);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null); // Para Cliente Externo e Cliente
  
  const isMobileOpen = mobileOpen !== undefined ? mobileOpen : internalMobileOpen;
  const setIsMobileOpen = onMobileOpenChange || setInternalMobileOpen;

  // Mapeamento de IDs para rotas
  const routeMap: { [key: string]: string } = {
    'home': '/dashboard',
    'clients': '/clients',
    'calendar': '/calendar',
    'tasks': '/tasks',
    'tasks-archived': '/tasks/archived',
    'expense-requests': '/expense-requests',
    'courses': '/courses',
    'collaborators': '/collaborators',
    'settings': '/settings',
    'support-web': '/support',
    'documents': '/documents',
    'presets': '/presets',
    'projetos': '/projetos'
  };

  // Sincronizar estado quando a prop muda
  useEffect(() => {
    if (mobileOpen !== undefined && mobileOpen !== isMobileOpen) {
      // Estado será atualizado automaticamente pelo isMobileOpen
    }
  }, [mobileOpen]);

  // Auto-expandir tarefas quando estiver nas tabs de tarefas
  // No mobile, sempre expandir as tarefas
  useEffect(() => {
    if (isMobile) {
      setTasksExpanded(true);
    } else if (activeTab === 'tasks' || activeTab === 'tasks-archived' || location.pathname === '/tasks' || location.pathname === '/tasks/archived') {
      setTasksExpanded(true);
    }
  }, [activeTab, isMobile, location.pathname]);

  // Menu padrão para usuários não-comerciais (Nível 2-5)
  // Ordem: Início, Clientes, Agenda, Tarefas, Solicitações, Colaboradores (se permitido), Suporte
  const defaultMenuItems = [
    {
      id: "home",
      icon: <Home className="h-4 w-4" />,
      label: "Início",
      requiresPermission: false
    },
    {
      id: "clients",
      icon: <User className="h-4 w-4" />,
      label: "Clientes",
      requiresPermission: false
    },
    {
      id: "calendar",
      icon: <Calendar className="h-4 w-4" />,
      label: "Agenda",
      requiresPermission: false
    },
    {
      id: "tasks",
      icon: <KanbanSquare className="h-4 w-4" />,
      label: "Tarefas",
      requiresPermission: false,
      hasSubmenu: true
    },
    {
      id: "expense-requests",
      icon: <Receipt className="h-4 w-4" />,
      label: "Solicitações",
      requiresPermission: false
    },
    {
      id: "courses",
      icon: <GraduationCap className="h-4 w-4" />,
      label: "Cursos",
      requiresPermission: true,
      permission: 'manage_department'
    },
    {
      id: "collaborators",
      icon: <Users className="h-4 w-4" />,
      label: "Colaboradores",
      requiresPermission: true,
      permission: 'manage_department'
    },
    {
      id: "support-web",
      icon: <HelpCircle className="h-4 w-4" />,
      label: "Suporte",
      requiresPermission: true,
      permission: 'suporte_web'
    }
  ];


  // Menu específico para Cliente Externo e Cliente (Tarefas e Minha Pasta)
  const clientExternalMenuItems = [
    {
      id: "tasks",
      icon: <KanbanSquare className="h-4 w-4" />,
      label: "Tarefas",
      requiresPermission: false,
      hasSubmenu: true
    },
    {
      id: "my-folder",
      icon: <FolderOpen className="h-4 w-4" />,
      label: "Minha Pasta",
      requiresPermission: false
    },
    {
      id: "support-web",
      icon: <HelpCircle className="h-4 w-4" />,
      label: "Suporte",
      requiresPermission: true,
      permission: 'suporte_web'
    }
  ];

  // Menu completo para Nível 1 (acesso total a todos os módulos)
  // Ordem: Início, Colaboradores, Clientes, Agenda, Tarefas, Solicitações, Configurações, Suporte
  const directorTiMenuItems = [
    {
      id: "home",
      icon: <Home className="h-4 w-4" />,
      label: "Início",
      requiresPermission: false
    },
    {
      id: "collaborators",
      icon: <Users className="h-4 w-4" />,
      label: "Colaboradores",
      requiresPermission: true,
      permission: 'manage_department'
    },
    {
      id: "courses",
      icon: <GraduationCap className="h-4 w-4" />,
      label: "Cursos",
      requiresPermission: true,
      permission: 'manage_department'
    },
    {
      id: "clients",
      icon: <User className="h-4 w-4" />,
      label: "Clientes",
      requiresPermission: false
    },
    {
      id: "calendar",
      icon: <Calendar className="h-4 w-4" />,
      label: "Agenda",
      requiresPermission: false
    },
    {
      id: "tasks",
      icon: <KanbanSquare className="h-4 w-4" />,
      label: "Tarefas",
      requiresPermission: false,
      hasSubmenu: true
    },
    {
      id: "expense-requests",
      icon: <Receipt className="h-4 w-4" />,
      label: "Solicitações",
      requiresPermission: false
    },
    {
      id: "settings",
      icon: <Settings className="h-4 w-4" />,
      label: "Configurações",
      requiresPermission: true,
      permission: 'settings_access'
    },
    {
      id: "support-web",
      icon: <HelpCircle className="h-4 w-4" />,
      label: "Suporte",
      requiresPermission: true,
      permission: 'suporte_web'
    }
  ];

  // Determinar qual menu usar baseado na hierarquia (memoizado para evitar re-renderizações)
  // Nível 1 vê todos os menus (usar directorTiMenuItems que tem tudo)
  const menuItems = useMemo(() => {
    if (userRole === 'Cliente Externo' || userRole === 'Cliente') {
      return clientExternalMenuItems;
    }
    
    // Para níveis numéricos, verificar o número do nível
    const levelNum = getLevelNumber(userRole);
    
    // Nível 1 vê todos os menus (menu completo)
    if (levelNum === 1) {
      return directorTiMenuItems;
    }
    
    // Para outros níveis, usar menu padrão
    return defaultMenuItems;
  }, [userRole]);

  // Obter a hierarquia do usuário atual (executado apenas uma vez)
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserRole = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          if (isMounted) {
            setUserRole('Nível 5');
            setIsLoading(false);
          }
          return;
        }

        // Buscar dados do usuário no Firestore - coleção users
        const userDocRef = await getDoc(doc(db, "users", currentUser.uid));
        if (!isMounted) return;
        
        if (userDocRef.exists()) {
          const userData = userDocRef.data();
          const role = userData.hierarchyLevel || 'Nível 5';
          setUserRole(role);
          
          // Se for Cliente Externo ou Cliente, buscar o ID do cliente vinculado
          if (role === 'Cliente Externo' || role === 'Cliente') {
            const clientsQuery = query(
              collection(db, 'clients'),
              where('collaboratorId', '==', currentUser.uid)
            );
            const clientsSnapshot = await getDocs(clientsQuery);
            if (!clientsSnapshot.empty && isMounted) {
              const clientDoc = clientsSnapshot.docs[0];
              setClientId(clientDoc.id);
            }
          }
        } else {
          if (isMounted) {
            setUserRole('Nível 5');
          }
        }
      } catch (error) {
        console.error("Erro ao buscar papel do usuário:", error);
        if (isMounted) {
          setUserRole('Nível 5');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Verificar se o auth está pronto antes de buscar o perfil
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && isMounted) {
        fetchUserRole();
      } else if (isMounted) {
        setUserRole('Nível 5');
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // Executado apenas uma vez na montagem

  // Filtrar itens baseado nas permissões do usuário (memoizado para evitar re-renderizações)
  // Nível 1 vê todos os menus sem filtro
  const availableMenuItems = useMemo(() => {
    const levelNum = getLevelNumber(userRole);
    if (levelNum === 1) {
      return menuItems; // Nível 1 vê tudo
    }
    return menuItems.filter(item => {
      if (!item.requiresPermission) return true;
      if ('permission' in item && item.permission) {
        return hasPermission(userRole, item.permission as string);
      }
      return true;
    });
  }, [menuItems, userRole]);

  // Conteúdo da Sidebar
  const SidebarContent = () => (
    <>
      {/* Logo area */}
        <div className="flex items-center justify-center p-2 md:p-3 h-14 md:h-[80px] border-b border-border bg-white relative overflow-hidden" style={{ backgroundRepeat: 'no-repeat' }}>
        <Logo variant="default" />
        {isMobile && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto h-7 w-7 p-0 text-gray-900 hover:bg-gray-100 hover:text-gray-900 absolute right-3"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {/* Menu items */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="space-y-3 px-2">
          {availableMenuItems.map((item) => {
            return (
            <div key={item.id}>
              {/* Adicionar separador antes do item de suporte */}
              {item.id === 'support-web' && (
                <div className="mx-2 my-3">
                  <div className="border-t border-border"></div>
                </div>
              )}
              {item.id === 'tasks' && (!isCollapsed || isMobile) ? (
                <>
                  <Button
                    variant="ghost"
                    type="button"
                    className={`
                      w-full flex items-center justify-between px-2 
                      py-1.5 text-sm font-medium rounded-md transition-colors duration-200 h-10 min-h-[44px] touch-manipulation pointer-events-auto
                      ${tasksExpanded || activeTab === 'tasks' || activeTab === 'tasks-archived'
                        ? 'bg-red-500 text-white shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }
                    `}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isMobile) {
                        setTasksExpanded(!tasksExpanded);
                      }
                      // No mobile, não precisa fazer nada pois já está sempre expandido
                    }}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-2">
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                    </div>
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform ${tasksExpanded ? 'rotate-180' : ''}`}
                    />
                  </Button>
                  {tasksExpanded && (
                    <div className="ml-6 space-y-1 mt-1">
                      <Button
                        variant="ghost"
                        type="button"
                        className={`
                          w-full flex items-center justify-start px-2 
                          py-1.5 text-sm font-medium rounded-md transition-colors duration-200 h-10 min-h-[44px] touch-manipulation pointer-events-auto
                          ${(activeTab === 'tasks' || location.pathname === '/tasks') && activeTab !== 'tasks-archived'
                            ? 'bg-red-500 text-white shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          }
                        `}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate('/tasks', { state: { activeTab: 'tasks' } });
                          if (isMobile) {
                            setIsMobileOpen(false);
                          }
                        }}
                      >
                        <KanbanSquare className="h-3 w-3 mr-2" />
                        <span className="text-sm">Tarefas</span>
                      </Button>
                      {/* Cliente Externo e Cliente não podem ver tarefas arquivadas */}
                      {(userRole !== 'Cliente Externo' && userRole !== 'Cliente') && (
                        <Button
                          variant="ghost"
                          type="button"
                          className={`
                            w-full flex items-center justify-start px-2 
                            py-1.5 text-sm font-medium rounded-md transition-colors duration-200 h-10 min-h-[44px] touch-manipulation pointer-events-auto
                            ${activeTab === 'tasks-archived' || location.pathname === '/tasks/archived'
                              ? 'bg-red-500 text-white shadow-sm' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }
                          `}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate('/tasks/archived', { state: { activeTab: 'tasks-archived' } });
                            if (isMobile) {
                              setIsMobileOpen(false);
                            }
                          }}
                        >
                          <Archive className="h-3 w-3 mr-2" />
                          <span className="text-sm">Arquivados</span>
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <Button
                  variant="ghost"
                  className={`
                    w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'justify-between px-2'} 
                    py-1.5 text-sm font-medium rounded-md transition-colors duration-200 h-9
                    ${activeTab === item.id
                      ? 'bg-red-500 text-white shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                  onClick={() => {
                    if (item.id === 'tasks') {
                      setTasksExpanded(!tasksExpanded);
                    } else if (item.id === 'my-folder' && (userRole === 'Cliente Externo' || userRole === 'Cliente')) {
                      // Se for "Minha Pasta" e Cliente Externo, navegar para a rota do cliente
                      if (clientId) {
                        navigate(`/client/${clientId}`, { state: { activeTab: 'documents' } });
                      } else {
                        // Se ainda não carregou o clientId, buscar agora
                        const fetchClientId = async () => {
                          const currentUser = auth.currentUser;
                          if (currentUser) {
                            const clientsQuery = query(
                              collection(db, 'clients'),
                              where('collaboratorId', '==', currentUser.uid)
                            );
                            const clientsSnapshot = await getDocs(clientsQuery);
                            if (!clientsSnapshot.empty) {
                              const clientDoc = clientsSnapshot.docs[0];
                              navigate(`/client/${clientDoc.id}`, { state: { activeTab: 'documents' } });
                            } else {
                              navigate('/dashboard', { state: { activeTab: 'tasks' } });
                            }
                          }
                        };
                        fetchClientId();
                      }
                    } else {
                      const route = routeMap[item.id] || '/dashboard';
                      // Só navegar se não estiver já na rota correta
                      if (location.pathname !== route) {
                        navigate(route, { state: { activeTab: item.id } });
                      } else {
                        // Se já está na rota, apenas atualizar o activeTab
                        onTabChange(item.id);
                      }
                    }
                  }}
                >
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-2'}`}>
                      {item.icon}
                    </div>
                    {!isCollapsed && (
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                    )}
                  </div>
                </Button>
              )}
            </div>
          );
          })}
        </div>
      </nav>

      {/* Footer section */}
      <div className="p-2 border-t border-border">
        {(!isCollapsed || isMobile) && (
          <div className="text-[10px] text-sidebar-foreground/60 text-center">
            Titaniumfix 2025
          </div>
        )}
      </div>
    </>
  );

  // Desktop: Sidebar fixa
  if (!isMobile) {
    return (
      <aside 
        className={`h-screen bg-white transition-all duration-300 z-10 flex flex-col border-r border-border ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>
    );
  }

  // Mobile: Usar Sheet (drawer) - sempre renderizar, mas controlado pelo estado
  return (
    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
      <SheetContent 
        side="left" 
          className="w-[85vw] max-w-[320px] p-0 bg-white border-r border-border [&>button]:hidden z-50"
      >
        <div className="flex flex-col h-full overflow-hidden">
          <SidebarContent />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CustomSidebar;
