import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Camera, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { AgendaComponent } from "@/components/AgendaComponent";
import { CollaboratorManagement } from "@/components/CollaboratorManagement";
import { ClientManagement } from "@/components/ClientManagement";
import { CourseManagement } from "@/components/CourseManagement";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import CustomSidebar from "@/components/CustomSidebar";
import KanbanBoard from "@/components/KanbanBoard";
import ArchivedTasks from "@/components/ArchivedTasks";
import { auth, db, storage } from "@/config/firebase";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import ChatbotManager from "@/components/ChatbotManager";
import { ExpenseRequestManagement } from "@/components/ExpenseRequestManagement";
import Presets from "./Presets";
import Projects from "./Projects";
import ProjectWrite from "./ProjectWrite";
import ProjectView from "./ProjectView";
import ProjectMap from "./ProjectMap";
import { updateProfile, onAuthStateChanged } from "firebase/auth";
import { useTabCloseLogout } from "@/hooks/useTabCloseLogout";
import { getAuth, signOut } from "firebase/auth";
import { useHeaderActions } from '@/contexts/HeaderActionsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { hasPermission } from "@/utils/hierarchyUtils";
import { HierarchyLevel } from "@/types";
import SettingsManager from "@/components/SettingsManager";
import { SupportMainPage } from "@/components/support/SupportMainPage";
import { SupportNotifications } from "@/components/support/SupportNotifications";

interface UserData {
  name: string;
  role: string;
  avatar: string;
}

const Dashboard = () => {
  // Ativa o logout automático quando a guia é fechada
  useTabCloseLogout();
  
  const navigate = useNavigate();
  const location = useLocation();
  // REMOVIDO: const { rightAction } = useHeaderActions();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"home" | "collaborators" | "clients" | "calendar" | "tasks" | "tasks-archived" | "chatbot" | "expense-requests" | "support-web" | "settings" | "presets" | "projetos" | "project-write" | "project-view" | "project-map" | "courses">("home");
  const [avatarUrl, setAvatarUrl] = useState("/placeholder.svg");
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    name: "Usuário",
    role: "Estagiário/Auxiliar",
    avatar: "/placeholder.svg"
  });
  const [editableFirstName, setEditableFirstName] = useState("");
  const [editableLastName, setEditableLastName] = useState("");
  const [user, setUser] = useState(null);
  const [tempAvatarBase64, setTempAvatarBase64] = useState<string | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Verificar se há um estado de activeTab na localização 
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    // Verificar se está nas rotas de presets ou projetos e ajustar a tab
    if (location.pathname.startsWith('/presets')) {
      setActiveTab('presets');
    } else if (location.pathname.startsWith('/projetos/')) {
      // Se for /projetos/:id/map, é mapa
      if (location.pathname.endsWith('/map')) {
        setActiveTab('project-map');
      }
      // Se for /projetos/:id/edit, é edição
      else if (location.pathname.endsWith('/edit')) {
        setActiveTab('project-write');
      } 
      // Se for /projetos/:id (sem /edit e sem /map), é visualização
      else {
        const pathMatch = location.pathname.match(/^\/projetos\/(.+)$/);
        if (pathMatch && pathMatch[1] && pathMatch[1] !== 'edit' && pathMatch[1] !== 'map') {
          setActiveTab('project-view');
        } else {
          setActiveTab('projetos');
        }
      }
    } else if (location.pathname.startsWith('/projetos')) {
      setActiveTab('projetos');
    } else if (location.pathname === '/tasks/archived') {
      setActiveTab('tasks-archived');
    } else if (location.pathname === '/tasks') {
      setActiveTab('tasks');
    }
  }, [location]);


  // Efeito para carregar dados do usuário do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);

        // Buscar dados do usuário no Firestore - priorizar coleção unificada
        let userData = null;
        
        // Tentar buscar na coleção unificada primeiro
        const unifiedDoc = await getDoc(doc(db, "collaborators_unified", user.uid));
        if (unifiedDoc.exists()) {
          userData = unifiedDoc.data();
          // Mostrar apenas o firstName
          const displayName = userData.firstName || "Usuário";
          
          // Usar hierarchyLevel diretamente do documento
          const hierarchyLevel = userData.hierarchyLevel || "Estagiário/Auxiliar";
          
          setUserData({
            name: displayName,
            role: hierarchyLevel,
            avatar: userData.avatar || userData.photoURL || "/placeholder.svg"
          });
          
          setEditableFirstName(userData.firstName || "");
          setEditableLastName(userData.lastName || "");
        } else {
          // Se não encontrou na coleção unificada, definir dados padrão
          console.error("❌ Dashboard - Usuário não encontrado na coleção collaborators_unified");
          console.error("   UID do usuário:", user.uid);
          console.error("   Email do usuário:", user.email);
          console.error("   Verifique se o cliente foi criado corretamente na coleção collaborators_unified");
          setUserData({
            name: "Usuário",
            role: "Estagiário/Auxiliar",
            avatar: "/placeholder.svg"
          });
          setEditableFirstName("");
          setEditableLastName("");
        }
      } else {
        setUser(null);
        setUserData({
          name: "Usuário",
          role: "Estagiário/Auxiliar",
          avatar: "/placeholder.svg"
        });
        setEditableFirstName("");
        setEditableLastName("");
      }
    });

    return () => unsubscribe();
  }, []);

  // Função para gerar as iniciais corretas do nome do usuário
  const getAvatarInitials = (name: string): string => {
    if (!name || name === "Usuário") return "U";
    const nameParts = name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
  };

  const handleLogout = () => {
    auth.signOut().then(() => {
      toast.info("Você foi desconectado");
      navigate("/");
    }).catch((error) => {
      toast.error("Erro ao fazer logout: " + error.message);
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Mostrar feedback ao usuário
    toast.loading("Processando imagem...");
    
    // Criar uma imagem temporária para redimensionamento
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      // Liberar a URL do objeto após carregamento
      URL.revokeObjectURL(objectUrl);
      
      // Criar canvas para redimensionamento
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 200;
      const MAX_HEIGHT = 200;
      
      // Calcular proporções para redimensionamento
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      // Definir dimensões do canvas
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar imagem redimensionada no canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Obter base64 da imagem com qualidade reduzida
      const base64Image = canvas.toDataURL('image/jpeg', 0.7);
      
      // Armazenar temporariamente a imagem
      setTempAvatarBase64(base64Image);
      
      // Atualizar a prévia da imagem
      setPreviewAvatar(base64Image);
      
      toast.dismiss();
      toast.success("Imagem selecionada com sucesso!");
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.dismiss();
      toast.error("Erro ao processar a imagem");
    };
    
    img.src = objectUrl;
  };
  
  const updateAvatarInDatabase = async (base64Image: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.dismiss();
        toast.error("Usuário não autenticado");
        return;
      }
      
      // Atualizar apenas na coleção unificada
      const collaboratorDocRef = doc(db, 'collaborators_unified', currentUser.uid);
      await updateDoc(collaboratorDocRef, {
        photoURL: base64Image,
        avatar: base64Image,
        updatedAt: new Date()
      });
      
      // Tentar atualizar no Authentication (pode falhar se ainda estiver muito grande)
      try {
        await updateProfile(currentUser, {
          photoURL: base64Image
        });
      } catch (authError) {
        console.error("Erro ao atualizar avatar no Authentication:", authError);
        // Continuar mesmo se falhar no Auth, já que a imagem foi salva no Firestore
      }
      
      // Atualizar estado local
      setUserData(prev => ({
        ...prev,
        avatar: base64Image
      }));
      
      return true;
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
      toast.error("Erro ao atualizar a foto de perfil");
      return false;
    }
  };

  const handleProfileUpdate = async () => {
    try {
      toast.loading("Salvando alterações...");
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.dismiss();
        toast.error("Usuário não autenticado");
        return;
      }

      // Usar apenas o firstName para exibição
      const newDisplayName = editableFirstName || "Usuário";
      let updateSuccessful = true;
      
      // Verificar se temos uma nova imagem para salvar
      if (tempAvatarBase64) {
        updateSuccessful = await updateAvatarInDatabase(tempAvatarBase64);
        // Limpar a imagem temporária após salvar
        setTempAvatarBase64(null);
      }

      // Continuar com a atualização do nome apenas se a atualização da imagem foi bem-sucedida
      if (updateSuccessful) {
        // Atualizar apenas na coleção unificada
        const collaboratorDocRef = doc(db, 'collaborators_unified', currentUser.uid);
        await updateDoc(collaboratorDocRef, {
          firstName: editableFirstName,
          lastName: editableLastName,
          updatedAt: new Date()
        });

        // Atualizar no Authentication
        await updateProfile(currentUser, {
          displayName: newDisplayName
        });

        // Atualizar estado local
        setUserData(prev => ({
          ...prev,
          name: newDisplayName
        }));

        toast.dismiss();
        toast.success("Perfil atualizado com sucesso!");
        setIsAvatarDialogOpen(false);
      } else {
        toast.dismiss();
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.dismiss();
      toast.error("Erro ao atualizar o perfil");
    }
  };

  // Quando o diálogo é fechado sem salvar, reverter a imagem temporária
  useEffect(() => {
    if (!isAvatarDialogOpen) {
      setTempAvatarBase64(null);
      setPreviewAvatar(null);
    }
  }, [isAvatarDialogOpen]);
  
  // Quando o diálogo é aberto, carregar os valores atuais do nome
  useEffect(() => {
    if (isAvatarDialogOpen) {
      const names = userData.name.split(" ");
      setEditableFirstName(names[0] || "");
      setEditableLastName(names.slice(1).join(" ") || "");
    }
  }, [isAvatarDialogOpen, userData.name]);

  // Componente interno que usa o contexto do sidebar
  const DashboardContent = () => {
    const { isCollapsed, toggleSidebar } = useSidebar();
    const { rightAction } = useHeaderActions();
    
    // Memoizar o handler de mudança de tab para evitar re-renderizações
    const handleTabChange = useCallback((tab: string) => {
      if (tab === "documents") {
        navigate("/documents");
        return;
      }
      setActiveTab(tab as any);
    }, [navigate]);
    
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <CustomSidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        <div className="flex-1 flex flex-col h-screen overflow-hidden md:ml-0">
          <header className="bg-white text-gray-900 p-2 md:p-3 h-14 md:h-[80px] shadow-md sticky top-0 z-40 border-b border-gray-200">
            <div className="flex items-center h-full">
              {/* Botão Menu Mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden text-gray-900 hover:bg-gray-100 h-10 w-10"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Botão Colapsar Sidebar - Desktop (fixo à esquerda) */}
              <div className="hidden md:block">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    toggleSidebar();
                  }}
                  className="text-gray-900 hover:bg-gray-100 h-9 w-9"
                  title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronLeft className="h-5 w-5" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center gap-2 md:gap-4 ml-auto">
                {/* Ação do Header (botões de salvar, etc.) */}
                {rightAction && (
                  <div className="flex items-center">
                    {rightAction}
                  </div>
                )}
                
                {/* Notificações de Suporte - Oculto no mobile */}
                {hasPermission(userData.role as HierarchyLevel, 'suporte_web') && (
                  <div className="hidden md:block">
                    <SupportNotifications 
                      onNotificationClick={(ticketId) => {
                        setActiveTab('support-web');
                      }}
                    />
                  </div>
                )}


                {/* Avatar e Menu - Desktop */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center gap-2 md:gap-4 cursor-pointer">
                        <div className="hidden md:flex flex-col items-end mr-2">
                          <span className="font-medium text-sm text-gray-900">{userData.name}</span>
                          <span className="text-xs opacity-80 text-gray-700">{userData.role}</span>
                        </div>
                        <Avatar className="h-8 w-8 md:h-10 md:w-10">
                          <AvatarImage src={userData.avatar} alt={userData.name} />
                          <AvatarFallback>{getAvatarInitials(userData.name)}</AvatarFallback>
                        </Avatar>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setIsAvatarDialogOpen(true)}>
                        <Camera className="mr-2 h-4 w-4" />
                        <span>Configurações de Perfil</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout}>
                        <span>Sair</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Avatar - Mobile */}
                <div className="md:hidden flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-900 hover:bg-gray-100 h-10 w-10 p-0"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={userData.avatar} alt={userData.name} />
                          <AvatarFallback className="text-xs">{getAvatarInitials(userData.name)}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>{userData.name}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <span>Sair</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 dashboard-content bg-background text-foreground p-2 sm:p-4 md:p-6 overflow-auto h-[calc(100vh-56px)] md:h-[calc(100vh-80px)]">
            {activeTab === "home" && (
              (userData.role === 'Comercial' || userData.role === 'Diretor Comercial') ? (
                <div className="h-full flex items-center justify-center flex-col">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center max-w-md">
                    <h2 className="text-2xl font-semibold text-blue-800 mb-4">Dashboard Comercial</h2>
                    <p className="text-blue-700 mb-6">
                      Como usuário comercial, você será redirecionado automaticamente para o seu dashboard específico.
                    </p>
                    <p className="text-sm text-blue-600">
                      Aguarde o redirecionamento automático...
                    </p>
                  </div>
                </div>
              ) : (
                <DashboardOverview />
              )
            )}
            {activeTab === "collaborators" && 
              (hasPermission(userData.role as HierarchyLevel, 'manage_department') ? (
                <CollaboratorManagement />
              ) : (
                <div className="h-full flex items-center justify-center flex-col">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center max-w-md">
                    <h2 className="text-2xl font-semibold text-yellow-800 mb-4">Acesso Restrito</h2>
                    <p className="text-yellow-700 mb-6">
                      Esta área é reservada para gerentes e administradores.
                    </p>
                    <p className="text-sm text-yellow-600">
                      Se você precisa de acesso a esta funcionalidade, entre em contato com um superior hierárquico.
                    </p>
                  </div>
                </div>
              ))
            }
            {activeTab === "clients" && (
              userData.role === 'Comercial' ? (
                <div className="h-full flex items-center justify-center flex-col">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center max-w-md">
                    <h2 className="text-2xl font-semibold text-yellow-800 mb-4">Acesso Restrito</h2>
                    <p className="text-yellow-700 mb-6">
                      O gerenciamento de clientes é responsabilidade dos superiores hierárquicos.
                    </p>
                    <p className="text-sm text-yellow-600">
                      Entre em contato com seu superior hierárquico para solicitar acesso.
                    </p>
                  </div>
                </div>
              ) : (
                <ClientManagement />
              )
            )}
            {activeTab === "calendar" && <AgendaComponent userId={user?.uid} userName={userData.name} />}
            {activeTab === "tasks" && <div className="w-full h-full flex flex-col"><KanbanBoard /></div>}
            {activeTab === "tasks-archived" && <div className="w-full h-full flex flex-col"><ArchivedTasks /></div>}
            {activeTab === "chatbot" && (
              hasPermission(userData.role as HierarchyLevel, 'chatbot_access') ? (
                <ChatbotManager />
              ) : (
                <div className="h-full flex items-center justify-center flex-col">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center max-w-md">
                    <h2 className="text-2xl font-semibold text-yellow-800 mb-4">Acesso Restrito</h2>
                    <p className="text-yellow-700 mb-6">
                      O ChatBot está disponível apenas para Presidente, Diretor e Gerente.
                    </p>
                    <p className="text-sm text-yellow-600">
                      Entre em contato com seu superior hierárquico para solicitar acesso.
                    </p>
                  </div>
                </div>
              )
            )}
            {activeTab === "expense-requests" && <ExpenseRequestManagement />}
            {activeTab === "support-web" && (
              hasPermission(userData.role as HierarchyLevel, 'suporte_web') ? (
                <SupportMainPage />
              ) : (
                <div className="h-full flex items-center justify-center flex-col">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center max-w-md">
                    <h2 className="text-2xl font-semibold text-yellow-800 mb-4">Acesso Restrito</h2>
                    <p className="text-yellow-700 mb-6">
                      O sistema de suporte web não está disponível para seu nível hierárquico.
                    </p>
                    <p className="text-sm text-yellow-600">
                      Entre em contato com seu superior hierárquico para solicitar acesso.
                    </p>
                  </div>
                </div>
              )
            )}
            {activeTab === "courses" && (
              hasPermission(userData.role as HierarchyLevel, 'manage_department') ? (
                <CourseManagement />
              ) : (
                <div className="h-full flex items-center justify-center flex-col">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center max-w-md">
                    <h2 className="text-2xl font-semibold text-yellow-800 mb-4">Acesso Restrito</h2>
                    <p className="text-yellow-700 mb-6">
                      O gerenciamento de cursos está disponível apenas para Nível 1, 2 e 3.
                    </p>
                    <p className="text-sm text-yellow-600">
                      Entre em contato com seu superior hierárquico para solicitar acesso.
                    </p>
                  </div>
                </div>
              )
            )}
            {activeTab === "settings" && (
              hasPermission(userData.role as HierarchyLevel, 'settings_access') ? (
                <SettingsManager />
              ) : (
                <div className="h-full flex items-center justify-center flex-col">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center max-w-md">
                    <h2 className="text-2xl font-semibold text-yellow-800 mb-4">Acesso Restrito</h2>
                    <p className="text-yellow-700 mb-6">
                      As configurações do sistema estão disponíveis apenas para Presidente e Diretor de TI.
                    </p>
                    <p className="text-sm text-yellow-600">
                      Entre em contato com seu superior hierárquico para solicitar acesso.
                    </p>
                  </div>
                </div>
              )
            )}
            {activeTab === "presets" && <Presets />}
            {activeTab === "projetos" && <Projects />}
            {activeTab === "project-write" && <ProjectWrite />}
            {activeTab === "project-view" && <ProjectView />}
            {activeTab === "project-map" && <ProjectMap />}
          </main>
        </div>
        <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Configurações de Perfil</DialogTitle>
              <DialogDescription>
                Altere sua foto de perfil e outras configurações da conta.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={previewAvatar || userData.avatar} alt={userData.name} />
                <AvatarFallback className="text-2xl">{getAvatarInitials(userData.name)}</AvatarFallback>
              </Avatar>

              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 text-red-500 hover:text-red-600">
                  <Camera size={18} />
                  <span>Alterar foto</span>
                </div>
                <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </Label>

              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    value={editableFirstName}
                    onChange={(e) => setEditableFirstName(e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input
                    id="lastName"
                    value={editableLastName}
                    onChange={(e) => setEditableLastName(e.target.value)}
                    placeholder="Seu sobrenome"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAvatarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" onClick={handleProfileUpdate}>
                Salvar alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  );
};

export default Dashboard;
