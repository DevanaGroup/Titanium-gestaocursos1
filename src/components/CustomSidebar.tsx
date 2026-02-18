import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import Logo from '@/components/Logo';
import { 
  Home, Users, Calendar, CalendarDays,
  KanbanSquare, FileText, Receipt,
  GraduationCap,
  FolderOpen, ChevronDown, X, Archive, BookOpen, UserCircle,
  DollarSign, TrendingUp, TrendingDown, BarChart3, Database,
  Bell, LogOut, ChevronRight
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { auth, db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { hasPermission, hasFinancialAccess, getLevelNumber, normalizeHierarchyLevel } from "@/utils/hierarchyUtils";
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
  const [userRoleRaw, setUserRoleRaw] = useState<string>('Nível 5'); // Valor original do banco
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // Flag para garantir que só mostra loading na primeira vez
  const hasLoadedOnceRef = useRef(false); // Ref para rastrear se já carregou (evita problemas de closure)
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [coursesExpanded, setCoursesExpanded] = useState(false);
  const [financialExpanded, setFinancialExpanded] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null); // Para Cliente Externo e Cliente
  const [userData, setUserData] = useState<{ name: string; avatar: string; role: string }>({
    name: 'Usuário',
    avatar: '/placeholder.svg',
    role: 'Nível 5'
  });
  
  const isMobileOpen = mobileOpen !== undefined ? mobileOpen : internalMobileOpen;
  const setIsMobileOpen = onMobileOpenChange || setInternalMobileOpen;

  // Mapeamento de IDs para rotas
  const routeMap: { [key: string]: string } = {
    'home': '/dashboard',
    'calendar': '/calendar',
    'eventos': '/eventos',
    'tasks': '/tasks',
    'tasks-archived': '/tasks/archived',
    'financial': '/financial',
    'expense-requests': '/financial/expense-requests', // Mantido para compatibilidade
    'financial-incomes': '/financial/incomes',
    'financial-expenses': '/financial/expenses',
    'financial-teacher-payments': '/financial/teacher-payments',
    'financial-reports': '/financial/reports',
    'courses': '/courses',
    'lessons': '/lessons',
    'teachers': '/teachers',
    'collaborators': '/collaborators',
    'documents': '/documents',
    'presets': '/presets',
    'database': '/database'
  };

  // Sincronizar estado quando a prop muda
  useEffect(() => {
    if (mobileOpen !== undefined && mobileOpen !== isMobileOpen) {
      // Estado será atualizado automaticamente pelo isMobileOpen
    }
  }, [mobileOpen]);

  // Auto-expandir menu pai quando um sub-item estiver ativo
  // Otimizado para evitar atualizações desnecessárias de estado
  useEffect(() => {
    // Verificar se algum sub-item de Tarefas está ativo
    const isTasksSubItemActive = 
      activeTab === 'tasks' || 
      activeTab === 'tasks-archived' || 
      location.pathname === '/tasks' || 
      location.pathname.startsWith('/tasks/');
    
    // Só expandir automaticamente se um sub-item estiver ativo
    if (isTasksSubItemActive && !tasksExpanded) {
      setTasksExpanded(true);
    }
    
    // Verificar se algum sub-item de Cursos está ativo
    const isCoursesSubItemActive = 
      activeTab === 'courses' || 
      activeTab === 'lessons' || 
      activeTab === 'teachers' ||
      location.pathname === '/courses' || 
      location.pathname === '/lessons' || 
      location.pathname === '/teachers';
    
    // Só expandir automaticamente se um sub-item estiver ativo
    if (isCoursesSubItemActive && !coursesExpanded) {
      setCoursesExpanded(true);
    }
    
    // Verificar se algum sub-item de Financeiros está ativo
    const isFinancialSubItemActive = 
      activeTab === 'financial' ||
      activeTab === 'expense-requests' ||
      activeTab === 'financial-incomes' ||
      activeTab === 'financial-expenses' ||
      activeTab === 'financial-teacher-payments' ||
      activeTab === 'financial-reports' ||
      location.pathname.startsWith('/financial');
    
    // Só expandir automaticamente se um sub-item estiver ativo
    if (isFinancialSubItemActive && !financialExpanded) {
      setFinancialExpanded(true);
    }
  }, [activeTab, location.pathname]); // Removido tasksExpanded, coursesExpanded, financialExpanded para evitar loops

  // Menu padrão para usuários não-comerciais (Nível 2-5)
  // Ordem: Início, Agenda, Eventos, Tarefas, Financeiros, Colaboradores (se permitido), Suporte
  const defaultMenuItems = [
    {
      id: "home",
      icon: <Home className="h-4 w-4" />,
      label: "Início",
      requiresPermission: false
    },
    {
      id: "calendar",
      icon: <Calendar className="h-4 w-4" />,
      label: "Agenda",
      requiresPermission: false
    },
    {
      id: "eventos",
      icon: <CalendarDays className="h-4 w-4" />,
      label: "Eventos",
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
      id: "financial",
      icon: <DollarSign className="h-4 w-4" />,
      label: "Financeiros",
      requiresPermission: true,
      permission: 'view_financial_reports',
      hasSubmenu: true
    },
    {
      id: "courses",
      icon: <GraduationCap className="h-4 w-4" />,
      label: "Cursos",
      requiresPermission: true,
      permission: 'manage_department',
      hasSubmenu: true
    },
    {
      id: "collaborators",
      icon: <Users className="h-4 w-4" />,
      label: "Colaboradores",
      requiresPermission: true,
      permission: 'manage_department'
    },
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
  ];

  // Menu completo para Nível 1 (acesso total a todos os módulos)
  // Ordem: Início, Colaboradores, Agenda, Tarefas, Financeiros
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
      permission: 'manage_department',
      hasSubmenu: true
    },
    {
      id: "calendar",
      icon: <Calendar className="h-4 w-4" />,
      label: "Agenda",
      requiresPermission: false
    },
    {
      id: "eventos",
      icon: <CalendarDays className="h-4 w-4" />,
      label: "Eventos",
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
      id: "financial",
      icon: <DollarSign className="h-4 w-4" />,
      label: "Financeiros",
      requiresPermission: true,
      permission: 'view_financial_reports',
      hasSubmenu: true
    },
  ];

  // Menu exclusivo para Nível 0 (AdminTI)
  const adminTiMenuItems = [
    {
      id: "home",
      icon: <Home className="h-4 w-4" />,
      label: "Início",
      requiresPermission: false
    },
    {
      id: "database",
      icon: <Database className="h-4 w-4" />,
      label: "Banco de Dados",
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
      permission: 'manage_department',
      hasSubmenu: true
    },
    {
      id: "calendar",
      icon: <Calendar className="h-4 w-4" />,
      label: "Agenda",
      requiresPermission: false
    },
    {
      id: "eventos",
      icon: <CalendarDays className="h-4 w-4" />,
      label: "Eventos",
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
      id: "financial",
      icon: <DollarSign className="h-4 w-4" />,
      label: "Financeiros",
      requiresPermission: true,
      permission: 'view_financial_reports',
      hasSubmenu: true
    },
  ];

  // Determinar qual menu usar baseado na hierarquia (memoizado para evitar re-renderizações)
  // Nível 0 tem menu exclusivo com Banco de Dados, Nível 1 vê menu completo
  const menuItems = useMemo(() => {
    if (userRoleRaw === 'Cliente Externo' || userRoleRaw === 'Cliente') {
      return clientExternalMenuItems;
    }
    
    // Para níveis numéricos, verificar o número do nível
    const levelNum = getLevelNumber(userRole);
    
    // Nível 0 tem menu exclusivo com Banco de Dados
    if (levelNum === 0) {
      return adminTiMenuItems;
    }
    
    // Nível 1 vê todos os menus (menu completo)
    if (levelNum === 1) {
      return directorTiMenuItems;
    }
    
    // Para outros níveis, usar menu padrão
    return defaultMenuItems;
  }, [userRole, userRoleRaw]);

  // Obter a hierarquia do usuário atual (executado apenas uma vez)
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserRole = async () => {
      if (!isMounted) return;
      
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          if (isMounted && !hasLoadedOnceRef.current) {
            setUserRole('Nível 5');
            setUserRoleRaw('Nível 5');
            setIsLoading(false);
            setHasLoadedOnce(true);
            hasLoadedOnceRef.current = true;
          }
          return;
        }

        // Buscar dados do usuário no Firestore - coleção users
        const userDocRef = await getDoc(doc(db, "users", currentUser.uid));
        if (!isMounted) return;
        
        if (userDocRef.exists()) {
          const userDataDoc = userDocRef.data();
          const roleRaw = userDataDoc.hierarchyLevel || 'Nível 5';
          const role = normalizeHierarchyLevel(roleRaw);
          setUserRole(role);
          setUserRoleRaw(roleRaw); // Manter valor original para comparações específicas
          
          // Atualizar dados do usuário para exibição no sidebar
          if (isMounted) {
            setUserData({
              name: userDataDoc.firstName || userDataDoc.displayName || 'Usuário',
              avatar: userDataDoc.photoURL || userDataDoc.avatar || '/placeholder.svg',
              role: roleRaw
            });
          }
          
          // Se for Cliente Externo ou Cliente, buscar o ID do cliente vinculado
          if (roleRaw === 'Cliente Externo' || roleRaw === 'Cliente') {
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
            setUserRoleRaw('Nível 5');
            setUserData({
              name: 'Usuário',
              avatar: '/placeholder.svg',
              role: 'Nível 5'
            });
          }
        }
      } catch (error) {
        console.error("Erro ao buscar papel do usuário:", error);
        if (isMounted) {
          setUserRole('Nível 5');
          setUserRoleRaw('Nível 5');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setHasLoadedOnce(true);
          hasLoadedOnceRef.current = true; // Marcar que já carregou pelo menos uma vez
        }
      }
    };

    // Verificar se o auth está pronto antes de buscar o perfil
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && isMounted) {
        // Só buscar se ainda não carregou ou se o usuário mudou
        if (!hasLoadedOnceRef.current) {
          fetchUserRole();
        }
      } else if (isMounted && !hasLoadedOnceRef.current) {
        // Só definir valores padrão se ainda não carregou
        setUserRole('Nível 5');
        setUserRoleRaw('Nível 5');
        setIsLoading(false);
        setHasLoadedOnce(true);
        hasLoadedOnceRef.current = true;
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // Executado apenas uma vez na montagem

  // Filtrar itens baseado nas permissões do usuário (memoizado para evitar re-renderizações)
  // Nível 0 vê tudo sem filtro
  const availableMenuItems = useMemo(() => {
    const levelNum = getLevelNumber(userRole);
    if (levelNum === 0) {
      return menuItems; // Nível 0 vê tudo (incluindo Banco de Dados)
    }
    if (levelNum === 1) {
      return menuItems; // Nível 1 vê tudo (exceto Banco de Dados)
    }
    return menuItems.filter(item => {
      if (!item.requiresPermission) return true;
      if ('permission' in item && item.permission) {
        return hasPermission(userRole, item.permission as string);
      }
      return true;
    });
  }, [menuItems, userRole]);

  // Memoizar o pathname atual para evitar re-renderizações desnecessárias
  const currentPathname = location.pathname;

  // Função helper para determinar se um item está ativo baseado na rota atual
  // Usa currentPathname para evitar re-criações desnecessárias
  const isItemActive = useCallback((itemId: string): boolean => {
    const route = routeMap[itemId];
    if (!route) return false;
    
    // Verificação direta da rota atual
    if (currentPathname === route) {
      return true;
    }
    
    // Casos especiais
    if (itemId === 'home' && currentPathname === '/dashboard') {
      return true;
    }
    // Tarefas: ativo se estiver em qualquer rota de tarefas
    if (itemId === 'tasks' && (currentPathname === '/tasks' || currentPathname.startsWith('/tasks/'))) {
      return true;
    }
    // Cursos: ativo se estiver em qualquer rota relacionada (cursos, aulas, professores)
    if (itemId === 'courses' && (
      currentPathname === '/courses' || 
      currentPathname === '/lessons' || 
      currentPathname === '/teachers' ||
      currentPathname.startsWith('/courses/') ||
      currentPathname.startsWith('/lessons/') ||
      currentPathname.startsWith('/teachers/')
    )) {
      return true;
    }
    // Financeiros: ativo se estiver em qualquer rota financeira
    if (itemId === 'financial' && currentPathname.startsWith('/financial')) {
      return true;
    }
    if (itemId === 'teachers' && currentPathname === '/teachers') {
      return true;
    }
    
    return false;
  }, [currentPathname, routeMap]);
  
  // Função para gerar iniciais do avatar
  const getAvatarInitials = useCallback((name: string): string => {
    if (!name || name === "Usuário") return "U";
    const nameParts = name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
  }, []);

  // Função para logout
  const handleLogout = useCallback(() => {
    (window as any).intentionalLogout = true;
    auth.signOut().then(() => {
      toast.info("Você foi desconectado");
      navigate("/");
    }).catch((error) => {
      toast.error("Erro ao fazer logout: " + error.message);
    });
  }, [navigate]);

  // Conteúdo da Sidebar
  const SidebarContent = useCallback(() => (
    <>
      {/* Logo area */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-white">
        <Logo variant="default" />
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Separador */}
      <div className="border-b border-gray-100" />

      {/* Perfil do usuário */}
      {(!isCollapsed || isMobile) && (
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userData.avatar} alt={userData.name} />
              <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                {getAvatarInitials(userData.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">{userData.name}</span>
              <span className="text-xs text-gray-600">{userData.role}</span>
            </div>
          </div>
        </div>
      )}

      {/* Separador */}
      <div className="border-b border-gray-100" />

      {/* Menu items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {isLoading && !hasLoadedOnce ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2"></div>
              <p className="text-xs text-gray-600">Carregando...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {availableMenuItems.map((item) => {
            return (
            <div key={item.id}>
              {item.id === 'tasks' && (!isCollapsed || isMobile) ? (
                <>
                  <Button
                    variant="ghost"
                    type="button"
                    className={`
                      w-full flex items-center justify-between px-3 
                      py-2 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                      ${tasksExpanded || isItemActive('tasks') || currentPathname === '/tasks' || currentPathname.startsWith('/tasks/')
                        ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                        : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                      }
                    `}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Sempre permitir expansão/colapso, tanto no mobile quanto no desktop
                      setTasksExpanded(prev => !prev);
                    }}
                  >
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 mr-2 ${tasksExpanded || isItemActive('tasks') || currentPathname === '/tasks' || currentPathname.startsWith('/tasks/') ? 'text-white' : 'text-gray-900'}`}>
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform ${tasksExpanded || isItemActive('tasks') || currentPathname === '/tasks' || currentPathname.startsWith('/tasks/') ? 'text-white' : 'text-gray-900'} ${tasksExpanded ? 'rotate-90' : ''}`}
                    />
                  </Button>
                  {tasksExpanded && (
                    <div className="ml-6 space-y-1 mt-1">
                      <Button
                        variant="ghost"
                        type="button"
                        className={`
                          w-full flex items-center justify-start px-3 
                          py-2 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                          ${currentPathname === '/tasks' && !currentPathname.startsWith('/tasks/archived')
                            ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                            : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                          }
                        `}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTabChange('tasks');
                          navigate('/tasks', { state: { activeTab: 'tasks' } });
                          if (isMobile) {
                            setIsMobileOpen(false);
                          }
                        }}
                      >
                        <KanbanSquare className={`h-3 w-3 mr-2 ${currentPathname === '/tasks' && !currentPathname.startsWith('/tasks/archived') ? 'text-white' : 'text-gray-900'}`} />
                        <span className="text-sm">Tarefas</span>
                      </Button>
                      {/* Cliente Externo e Cliente não podem ver tarefas arquivadas */}
                      {(userRoleRaw !== 'Cliente Externo' && userRoleRaw !== 'Cliente') && (
                        <Button
                          variant="ghost"
                          type="button"
                          className={`
                            w-full flex items-center justify-start px-3 
                            py-2 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                            ${currentPathname === '/tasks/archived'
                              ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                              : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                            }
                          `}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onTabChange('tasks-archived');
                            navigate('/tasks/archived', { state: { activeTab: 'tasks-archived' } });
                            if (isMobile) {
                              setIsMobileOpen(false);
                            }
                          }}
                        >
                          <Archive className={`h-3 w-3 mr-2 ${currentPathname === '/tasks/archived' ? 'text-white' : 'text-gray-900'}`} />
                          <span className="text-sm">Arquivados</span>
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : item.id === 'courses' && (!isCollapsed || isMobile) ? (
                <>
                  <Button
                    variant="ghost"
                    type="button"
                    className={`
                      w-full flex items-center justify-between px-2 
                      py-1.5 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                      ${coursesExpanded || isItemActive('courses') || currentPathname === '/lessons' || currentPathname === '/teachers'
                        ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                        : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                      }
                    `}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Sempre permitir expansão/colapso, tanto no mobile quanto no desktop
                      setCoursesExpanded(prev => !prev);
                    }}
                  >
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 mr-2 ${coursesExpanded || isItemActive('courses') || currentPathname === '/lessons' || currentPathname === '/teachers' ? 'text-white' : 'text-gray-900'}`}>
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform ${coursesExpanded || isItemActive('courses') || currentPathname === '/lessons' || currentPathname === '/teachers' ? 'text-white' : 'text-gray-900'} ${coursesExpanded ? 'rotate-90' : ''}`}
                    />
                  </Button>
                  {coursesExpanded && (
                    <div className="ml-6 space-y-1 mt-1">
                      <Button
                        variant="ghost"
                        type="button"
                        className={`
                          w-full flex items-center justify-start px-3 
                          py-2 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                          ${currentPathname === '/courses'
                            ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                            : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                          }
                        `}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTabChange('courses');
                          navigate('/courses', { state: { activeTab: 'courses' } });
                          if (isMobile) {
                            setIsMobileOpen(false);
                          }
                        }}
                      >
                        <GraduationCap className={`h-3 w-3 mr-2 ${currentPathname === '/courses' ? 'text-white' : 'text-gray-900'}`} />
                        <span className="text-sm">Cursos</span>
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        className={`
                          w-full flex items-center justify-start px-3 
                          py-2 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                          ${currentPathname === '/lessons'
                            ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                            : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                          }
                        `}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTabChange('lessons');
                          navigate('/lessons', { state: { activeTab: 'lessons' } });
                          if (isMobile) {
                            setIsMobileOpen(false);
                          }
                        }}
                      >
                        <BookOpen className={`h-3 w-3 mr-2 ${currentPathname === '/lessons' ? 'text-white' : 'text-gray-900'}`} />
                        <span className="text-sm">Aulas</span>
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        className={`
                          w-full flex items-center justify-start px-3 
                          py-2 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                          ${currentPathname === '/teachers'
                            ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                            : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                          }
                        `}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTabChange('teachers');
                          navigate('/teachers', { state: { activeTab: 'teachers' } });
                          if (isMobile) {
                            setIsMobileOpen(false);
                          }
                        }}
                      >
                        <UserCircle className={`h-3 w-3 mr-2 ${currentPathname === '/teachers' ? 'text-white' : 'text-gray-900'}`} />
                        <span className="text-sm">Professores</span>
                      </Button>
                    </div>
                  )}
                </>
              ) : item.id === 'financial' && (!isCollapsed || isMobile) ? (
                <>
                  <Button
                    variant="ghost"
                    type="button"
                    className={`
                      w-full flex items-center justify-between px-2 
                      py-1.5 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                      ${financialExpanded || isItemActive('financial') || currentPathname.startsWith('/financial')
                        ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                        : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                      }
                    `}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Sempre permitir expansão/colapso, tanto no mobile quanto no desktop
                      setFinancialExpanded(prev => !prev);
                    }}
                  >
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 mr-2 ${financialExpanded || isItemActive('financial') || currentPathname.startsWith('/financial') ? 'text-white' : 'text-gray-900'}`}>
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform ${financialExpanded || isItemActive('financial') || currentPathname.startsWith('/financial') ? 'text-white' : 'text-gray-900'} ${financialExpanded ? 'rotate-90' : ''}`}
                    />
                  </Button>
                  {financialExpanded && (
                    <div className="ml-6 space-y-1 mt-1">
                      <Button
                        variant="ghost"
                        type="button"
                        className={`
                          w-full flex items-center justify-start px-3 
                          py-2 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                          ${currentPathname === '/financial/expense-requests'
                            ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                            : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                          }
                        `}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTabChange('expense-requests');
                          navigate('/financial/expense-requests', { state: { activeTab: 'expense-requests' } });
                          if (isMobile) {
                            setIsMobileOpen(false);
                          }
                        }}
                      >
                        <Receipt className={`h-3 w-3 mr-2 ${currentPathname === '/financial/expense-requests' ? 'text-white' : 'text-gray-900'}`} />
                        <span className="text-sm">Solicitações</span>
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        className={`
                          w-full flex items-center justify-start px-3 
                          py-2 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                          ${currentPathname === '/financial/incomes'
                            ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                            : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                          }
                        `}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTabChange('financial-incomes');
                          navigate('/financial/incomes', { state: { activeTab: 'financial-incomes' } });
                          if (isMobile) {
                            setIsMobileOpen(false);
                          }
                        }}
                      >
                        <TrendingUp className={`h-3 w-3 mr-2 ${currentPathname === '/financial/incomes' ? 'text-white' : 'text-gray-900'}`} />
                        <span className="text-sm">Entradas</span>
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        className={`
                          w-full flex items-center justify-start px-3 
                          py-2 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                          ${currentPathname === '/financial/expenses'
                            ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                            : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                          }
                        `}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTabChange('financial-expenses');
                          navigate('/financial/expenses', { state: { activeTab: 'financial-expenses' } });
                          if (isMobile) {
                            setIsMobileOpen(false);
                          }
                        }}
                      >
                        <TrendingDown className={`h-3 w-3 mr-2 ${currentPathname === '/financial/expenses' ? 'text-white' : 'text-gray-900'}`} />
                        <span className="text-sm">Saídas</span>
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        className={`
                          w-full flex items-center justify-start px-3 
                          py-2 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                          ${currentPathname === '/financial/teacher-payments'
                            ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                            : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                          }
                        `}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTabChange('financial-teacher-payments');
                          navigate('/financial/teacher-payments', { state: { activeTab: 'financial-teacher-payments' } });
                          if (isMobile) {
                            setIsMobileOpen(false);
                          }
                        }}
                      >
                        <GraduationCap className={`h-3 w-3 mr-2 ${currentPathname === '/financial/teacher-payments' ? 'text-white' : 'text-gray-900'}`} />
                        <span className="text-sm">Pagamentos Professores</span>
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        className={`
                          w-full flex items-center justify-start px-3 
                          py-2 text-sm font-medium rounded-md h-10 min-h-[44px] touch-manipulation pointer-events-auto
                          ${currentPathname === '/financial/reports'
                            ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                            : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                          }
                        `}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTabChange('financial-reports');
                          navigate('/financial/reports', { state: { activeTab: 'financial-reports' } });
                          if (isMobile) {
                            setIsMobileOpen(false);
                          }
                        }}
                      >
                        <BarChart3 className={`h-3 w-3 mr-2 ${currentPathname === '/financial/reports' ? 'text-white' : 'text-gray-900'}`} />
                        <span className="text-sm">Relatórios</span>
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Button
                  variant="ghost"
                    className={`
                      w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'justify-between px-3'} 
                      py-2 text-sm font-medium rounded-md h-10
                      ${isItemActive(item.id)
                        ? 'bg-[#C0392B] text-white shadow-sm hover:bg-[#A93226] hover:text-white' 
                        : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200'
                      }
                    `}
                  onClick={() => {
                    // Atualizar activeTab imediatamente para evitar delay visual
                    onTabChange(item.id);
                    
                    if (item.id === 'tasks') {
                      setTasksExpanded(!tasksExpanded);
                    } else if (item.id === 'courses') {
                      setCoursesExpanded(!coursesExpanded);
                    } else if (item.id === 'financial') {
                      setFinancialExpanded(!financialExpanded);
                    } else if (item.id === 'my-folder' && (userRoleRaw === 'Cliente Externo' || userRoleRaw === 'Cliente')) {
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
                      if (currentPathname !== route) {
                        navigate(route, { state: { activeTab: item.id } });
                      }
                    }
                  }}
                >
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-2'} ${isItemActive(item.id) ? 'text-white' : 'text-gray-900'}`}>
                      {item.icon}
                    </div>
                    {!isCollapsed && (
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && item.hasSubmenu && (
                    <ChevronRight className={`h-4 w-4 ${isItemActive(item.id) ? 'text-white' : 'text-gray-900'}`} />
                  )}
                </Button>
              )}
            </div>
          );
          })}
          </div>
        )}
      </nav>

      {/* Separador */}
      <div className="border-b border-gray-100" />

      {/* Seção de navegação secundária - Notificações */}
      {(!isCollapsed || isMobile) && (
        <div className="px-2 py-2">
          <Button
            variant="ghost"
            className={`
              w-full flex items-center px-3 
              py-2 text-sm font-medium rounded-md h-10
              text-gray-800 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200
            `}
            onClick={() => {
              // TODO: Implementar navegação para notificações
              if (isMobile) {
                setIsMobileOpen(false);
              }
            }}
          >
            <Bell className="h-4 w-4 mr-2" />
            <span className="text-sm">Notificações</span>
          </Button>
        </div>
      )}

      {/* Botão Sair */}
      <div className="p-2 border-t border-gray-100">
        {(!isCollapsed || isMobile) && (
          <Button
            variant="outline"
            className="w-full flex items-center justify-center px-2 py-2 text-sm font-medium rounded-md h-10 border-gray-100 text-gray-800 hover:bg-gray-50 transition-colors duration-200"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Sair</span>
          </Button>
        )}
      </div>
    </>
  ), [
    isMobile,
    isCollapsed,
    isLoading,
    hasLoadedOnce,
    availableMenuItems,
    tasksExpanded,
    coursesExpanded,
    financialExpanded,
    userRoleRaw,
    clientId,
    isItemActive,
    currentPathname,
    onTabChange,
    navigate,
    setIsMobileOpen,
    routeMap,
    userData,
    getAvatarInitials,
    handleLogout
  ]);

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
        className="w-[280px] max-w-[85vw] p-0 bg-white border-r border-border z-[100]"
        style={{ 
          height: '100vh',
          minHeight: '100vh',
          maxHeight: '100vh',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          inset: '0 auto 0 0',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div 
          className="flex flex-col" 
          style={{ 
            height: '100vh',
            minHeight: '100vh',
            maxHeight: '100vh',
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <SidebarContent />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CustomSidebar;
