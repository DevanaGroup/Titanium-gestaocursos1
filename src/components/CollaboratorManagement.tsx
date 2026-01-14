import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Edit, Trash2, Eye, Users, CalendarIcon, History, Plus, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/config/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, query, where } from "firebase/firestore";
import { Collaborator, HierarchyLevel, CustomPermissions } from "@/types";
import { createUserWithEmailAndPassword, deleteUser, getAuth, updateProfile, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/config/firebase";
import { getDoc } from "firebase/firestore";
import { User } from "@/types";
import { useNavigate } from "react-router-dom";
import { 
  HIERARCHY_LEVELS, 
  canManageLevel, 
  hasPermission, 
  getManagedLevels,
  getHierarchyDescription,
  getHierarchyColor,
  canManagePermissions,
  getDefaultPermissions
} from "@/utils/hierarchyUtils";
import { PermissionsManager } from "@/components/PermissionsManager";
import { HistoryDialog } from "@/components/HistoryDialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

// Funções utilitárias para controle do modo administrativo
const enableAdministrativeMode = () => {
  (window as any).administrativeOperation = true;
  (window as any).collaboratorCreationInProgress = true;
  (window as any).intentionalLogout = true;
  console.log('🔒 Modo administrativo ativado - logout automático desabilitado');
};

const disableAdministrativeMode = () => {
  setTimeout(() => {
    (window as any).administrativeOperation = false;
    (window as any).collaboratorCreationInProgress = false;
    (window as any).intentionalLogout = false;
    console.log('🔓 Modo administrativo desativado - logout automático reativado');
  }, 1000);
};

const disableAdministrativeModeImmediate = () => {
  (window as any).administrativeOperation = false;
  (window as any).collaboratorCreationInProgress = false;
  (window as any).intentionalLogout = false;
  console.log('🔓 Modo administrativo desativado imediatamente');
};

interface AuditLog {
  action: string;
  performedBy: string;
  performedByName: string;
  performedOn: string;
  timestamp: Date;
  details: string;
  entityType: string;
  changes: Record<string, { from: any; to: any }>;
}

export const CollaboratorManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<HierarchyLevel>("Nível 5");
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedUserForDeletion, setSelectedUserForDeletion] = useState<string | null>(null);
  const [showCustomPermissions, setShowCustomPermissions] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<CustomPermissions | null>(null);
  
  // Estados para edição
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [editCustomPermissions, setEditCustomPermissions] = useState<CustomPermissions | null>(null);
  const [showEditCustomPermissions, setShowEditCustomPermissions] = useState(false);
  
  // Estados para histórico
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedCollaboratorForHistory, setSelectedCollaboratorForHistory] = useState<Collaborator | null>(null);
  
  const [newCollaborator, setNewCollaborator] = useState<Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'> & { password: string }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    whatsapp: "",
    birthDate: new Date(),
    hierarchyLevel: "Nível 5",
    password: "",
    uid: "",
    customPermissions: undefined
  });

  // Função para buscar colaboradores (extraída para poder ser chamada novamente)
  const fetchCollaborators = async () => {
    setIsLoading(true);
    try {
      console.log("🔍 CollaboratorManagement - Iniciando busca de colaboradores...");
      
      // Buscar na coleção users
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      
      if (usersSnapshot.size > 0) {
        console.log("✅ CollaboratorManagement - Usando coleção users:", usersSnapshot.size, "usuários");
        
          // Buscar também da coleção collaborators_unified para pegar avatares atualizados
          const unifiedCollection = collection(db, "collaborators_unified");
          const unifiedSnapshot = await getDocs(unifiedCollection);
          const unifiedDataMap = new Map();
          
          unifiedSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.uid) {
              unifiedDataMap.set(data.uid, data);
            }
          });
          
          const collaboratorsList = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            const uid = data.uid || doc.id;
            const unifiedData = unifiedDataMap.get(uid);
            
            // Priorizar avatar da coleção unificada, depois users
            const avatar = unifiedData?.avatar || unifiedData?.photoURL || data.avatar || data.photoURL || "";
            
            // Debug: log do avatar para verificar
            if (uid && avatar) {
              console.log(`🖼️ Avatar encontrado para ${data.firstName}:`, avatar);
            }
            
            return {
              id: doc.id,
              uid: uid,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.email || "",
              phone: data.phone || "",
              whatsapp: data.whatsapp || "",
              birthDate: data.birthDate?.toDate ? data.birthDate.toDate() : (data.birthDate ? new Date(data.birthDate) : new Date()),
              hierarchyLevel: data.hierarchyLevel as HierarchyLevel,
              customPermissions: data.customPermissions || undefined,
              avatar: avatar,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
              source: 'users' as const
            };
          });
        
        console.log("📋 CollaboratorManagement - Usuários carregados:", collaboratorsList.length);
        setCollaborators(collaboratorsList);
      } else {
        console.log("❌ CollaboratorManagement - Nenhum usuário encontrado na coleção users");
        toast.error("Nenhum usuário encontrado");
        setCollaborators([]);
      }
      
    } catch (error) {
      console.error("❌ CollaboratorManagement - Erro ao buscar colaboradores:", error);
      toast.error("Não foi possível carregar os colaboradores");
      setCollaborators([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, []);

  useEffect(() => {
    const fetchCurrentUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        // Buscar dados do usuário na coleção users
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          console.log("🔍 CollaboratorManagement - Dados do usuário atual:", userData);
          setCurrentUserData(userData);
          console.log("✅ CollaboratorManagement - Usuario atual carregado:", userData.hierarchyLevel);
        } else {
          console.log("⚠️ CollaboratorManagement - Usuario atual não encontrado na coleção users");
        }
      }
    };
    fetchCurrentUserData();
  }, []);

  const hasViewPermission = (userRole: HierarchyLevel): boolean => {
    return hasPermission(userRole, 'view_own_data');
  };

  const filteredCollaborators = collaborators.filter(collab => 
    collab.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    collab.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collab.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collab.hierarchyLevel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCollaborator(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string, field: string) => {
    setNewCollaborator(prev => ({ ...prev, [field]: value }));
  };

  const handleBirthDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setNewCollaborator(prev => ({ ...prev, birthDate: date }));
      setIsDatePickerOpen(false);
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const newDate = new Date(dateValue);
      setSelectedDate(newDate);
      setNewCollaborator(prev => ({ ...prev, birthDate: newDate }));
    }
  };

  // Função para gerenciar permissões customizáveis
  const handlePermissionChange = (permission: keyof CustomPermissions, value: boolean) => {
    if (!customPermissions) {
      // Se não tem permissões customizadas, criar com as padrões
      const defaultPerms = getDefaultPermissions(newCollaborator.hierarchyLevel);
      setCustomPermissions({ ...defaultPerms, [permission]: value });
    } else {
      setCustomPermissions(prev => prev ? { ...prev, [permission]: value } : null);
    }
    
    setNewCollaborator(prev => ({
      ...prev,
      customPermissions: customPermissions ? { ...customPermissions, [permission]: value } : undefined
    }));
  };

  // Função para alternar exibição das permissões customizadas
  const toggleCustomPermissions = () => {
    if (!showCustomPermissions) {
      // Ao mostrar, inicializar com permissões padrão
      const defaultPerms = getDefaultPermissions(newCollaborator.hierarchyLevel);
      setCustomPermissions(defaultPerms);
      setNewCollaborator(prev => ({ ...prev, customPermissions: defaultPerms }));
    } else {
      // Ao ocultar, remover permissões customizadas
      setCustomPermissions(null);
      setNewCollaborator(prev => ({ ...prev, customPermissions: undefined }));
    }
    setShowCustomPermissions(!showCustomPermissions);
  };

  // Atualizar permissões quando mudar o nível hierárquico
  const handleHierarchyLevelChange = (newLevel: HierarchyLevel) => {
    setNewCollaborator(prev => ({ ...prev, hierarchyLevel: newLevel }));
    
    if (showCustomPermissions) {
      // Se está mostrando permissões customizadas, atualizar com as padrões do novo nível
      const defaultPerms = getDefaultPermissions(newLevel);
      setCustomPermissions(defaultPerms);
      setNewCollaborator(prev => ({ ...prev, customPermissions: defaultPerms }));
    }
  };

  const canCreateLevel = (userLevel: HierarchyLevel, targetLevel: HierarchyLevel): boolean => {
    return canManageLevel(userLevel, targetLevel);
  };

  const createAuditLog = async (action: string, details: string, targetUserId: string, changes?: Record<string, { from: any; to: any }>) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

          // Buscar nome do usuário atual apenas na coleção unificada
    let currentUserName = currentUser.email || 'Usuário desconhecido';
    
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // Mostrar apenas o firstName
      currentUserName = userData?.firstName || currentUser.email || 'Usuário desconhecido';
    }

      const auditLog: AuditLog = {
        action,
        performedBy: currentUser.uid,
        performedByName: currentUserName,
        performedOn: targetUserId,
        timestamp: new Date(),
        details,
        entityType: 'collaborator',
        changes: changes || {}
      };

      await addDoc(collection(db, 'auditLogs'), {
        ...auditLog,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao criar log de auditoria:', error);
    }
  };

  const handleAddCollaborator = async () => {
    try {
      setIsLoading(true);
      
      // 🔒 ATIVAR MODO ADMINISTRATIVO - DESABILITAR LOGOUT AUTOMÁTICO COMPLETAMENTE
      enableAdministrativeMode();
      toast.info("Iniciando criação do colaborador...");

      // Verificar se o usuário atual tem permissão
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("Você precisa estar logado para realizar esta ação!");
        setIsLoading(false);
        return;
      }

      // Verificar permissões do usuário atual
      if (!currentUserData?.hierarchyLevel || !hasPermission(currentUserData.hierarchyLevel, 'manage_department')) {
        toast.error("Você não tem permissão para adicionar novos usuários!");
        setIsLoading(false);
        return;
      }

      if (!canManageLevel(currentUserData.hierarchyLevel, newCollaborator.hierarchyLevel)) {
        toast.error(`Você não pode criar usuários do nível: ${newCollaborator.hierarchyLevel}`);
        setIsLoading(false);
        return;
      }

      // Validar campos obrigatórios
      if (!newCollaborator.firstName || !newCollaborator.lastName || !newCollaborator.email || 
          !newCollaborator.password || !newCollaborator.birthDate || !newCollaborator.hierarchyLevel) {
        toast.error("Por favor, preencha todos os campos!");
        setIsLoading(false);
        return;
      }

      // Verificar se o email já existe na coleção unificada
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '==', newCollaborator.email)
      );
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        toast.error("Este e-mail já está sendo usado por outro usuário. Por favor, use um e-mail diferente.");
        setIsLoading(false);
        return;
      }

      // 📡 Chamar função serverless para criar usuário no Auth
      console.log('🚀 Chamando função serverless para criar usuário...');
      toast.info("Criando usuário no sistema de autenticação...");
      
      const token = await currentUser.getIdToken();
      
      const createUserResponse = await fetch('https://us-central1-cerrado-engenharia.cloudfunctions.net/createUserAuth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newCollaborator.email,
          password: newCollaborator.password,
          firstName: newCollaborator.firstName,
          lastName: newCollaborator.lastName,
          hierarchyLevel: newCollaborator.hierarchyLevel
        })
      });

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        throw new Error(errorData.error || 'Erro ao criar usuário no Auth');
      }

      const authResult = await createUserResponse.json();
      const newUserId = authResult.uid;
      
      console.log('✅ Usuário criado com sucesso no Auth:', newUserId);
      toast.success("Usuário criado no sistema de autenticação!");

      // ✅ SALVAR DADOS NA COLEÇÃO USERS
      console.log('💾 Salvando dados na coleção users...');
      toast.info("Salvando dados do usuário...");
      
      await setDoc(doc(db, 'users', newUserId), {
        uid: newUserId,
        email: newCollaborator.email,
        firstName: newCollaborator.firstName,
        lastName: newCollaborator.lastName,
        displayName: newCollaborator.firstName,
        hierarchyLevel: newCollaborator.hierarchyLevel,
        customPermissions: newCollaborator.customPermissions || null,
        photoURL: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Criar log de auditoria
      console.log('📝 Criando log de auditoria...');
      await createAuditLog(
        "CREATE_USER",
        `Novo usuário ${newCollaborator.hierarchyLevel} criado: ${newCollaborator.firstName} ${newCollaborator.lastName}`,
        newUserId
      );

      // Atualizar a lista de colaboradores
      const newCollaboratorObj: Collaborator = {
        id: newUserId,
        uid: newUserId,
        firstName: newCollaborator.firstName,
        lastName: newCollaborator.lastName,
        email: newCollaborator.email,
        phone: newCollaborator.phone || "",
        whatsapp: newCollaborator.whatsapp || "",
        birthDate: newCollaborator.birthDate,
        hierarchyLevel: newCollaborator.hierarchyLevel,
        customPermissions: newCollaborator.customPermissions,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setCollaborators(prev => [...prev, newCollaboratorObj]);
      
      toast.success(`✅ ${newCollaborator.hierarchyLevel} criado com sucesso! O usuário já pode fazer login.`);
      setIsAddDialogOpen(false);

      // Limpar o formulário
      setNewCollaborator({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        whatsapp: "",
        password: "",
        birthDate: new Date(),
        hierarchyLevel: "Nível 5",
        uid: "",
        customPermissions: undefined
      });
      
      // Limpar estados das permissões
      setShowCustomPermissions(false);
      setCustomPermissions(null);

      console.log('✅ Processo de criação de colaborador concluído com sucesso!');

    } catch (error: any) {
      console.error('❌ Erro geral ao criar usuário:', error);
      toast.error(`Erro ao criar usuário: ${error.message}`);
    } finally {
      // 🔓 SEMPRE DESATIVAR MODO ADMINISTRATIVO NO FINAL
      disableAdministrativeMode();
      
      setIsLoading(false);
    }
  };

  const handleDeleteCollaborator = async (id: string, uid: string) => {
    // Verificar se o usuário atual tem permissão
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("Você precisa estar logado para realizar esta ação!");
      return;
    }

        // ✅ BUSCAR DADOS DO USUÁRIO NA COLEÇÃO USERS
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (!userDoc.exists()) {
      toast.error("Usuário não encontrado na coleção users!");
      return;
    }

    const currentUserData = userDoc.data();
    console.log("🔍 handleDeleteCollaborator - Dados do usuário atual:", currentUserData);

    if (!currentUserData || !hasPermission(currentUserData.hierarchyLevel, 'manage_department')) {
      toast.error("Você não tem permissão para deletar colaboradores!");
      return;
    }

    // Não permitir que o usuário delete a si mesmo
    if (uid === currentUser.uid) {
      toast.error("Você não pode deletar sua própria conta!");
      return;
    }

    setSelectedUserForDeletion(uid);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUserForDeletion) return;

    try {
      // 🔒 ATIVAR MODO ADMINISTRATIVO
      enableAdministrativeMode();
      
      console.log("🗑️ Iniciando processo de deleção para usuário:", selectedUserForDeletion);

      // 1. Verificar se o usuário atual é um Gerente
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("Você precisa estar logado para realizar esta ação");
        return;
      }

      // Buscar dados do usuário atual na coleção users
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (!userDoc.exists()) {
        toast.error("Usuário não encontrado na coleção users");
        return;
      }

      const currentUserData = userDoc.data();
      console.log("🔍 CollaboratorManagement - Dados do usuário atual:", currentUserData);
      
      if (!currentUserData || !hasPermission(currentUserData?.hierarchyLevel, 'manage_department')) {
        toast.error("Apenas gerentes podem deletar usuários");
        return;
      }

      // 2. Verificar se não está tentando deletar a si mesmo
      if (selectedUserForDeletion === currentUser.uid) {
        toast.error("Você não pode deletar sua própria conta");
        return;
      }

      // 3. NOVA VALIDAÇÃO: Verificar o nível hierárquico do usuário a ser deletado
      const targetUserDoc = await getDoc(doc(db, "users", selectedUserForDeletion));
      if (!targetUserDoc.exists()) {
        toast.error("Usuário alvo não encontrado na coleção users");
        return;
      }

      const targetUserData = targetUserDoc.data();
      if (targetUserData) {
        const targetUserLevel = targetUserData?.hierarchyLevel;
        const currentUserLevel = currentUserData?.hierarchyLevel;
        
        // Não permitir deletar usuários do mesmo nível hierárquico
        if (currentUserLevel === targetUserLevel) {
          toast.error(`Você não pode deletar outro usuário do mesmo nível hierárquico (${currentUserLevel})`);
          return;
        }
        
        // Verificar se tem permissão hierárquica para deletar
        if (!canManageLevel(currentUserLevel, targetUserLevel)) {
          toast.error(`Você não tem permissão para deletar usuários do nível: ${targetUserLevel}`);
          return;
        }
      }

      // 4. Criar log de auditoria
      console.log("📝 Criando log de auditoria...");
      await createAuditLog(
        'delete_user',
        `Colaborador deletado por ${currentUser.email}`,
        selectedUserForDeletion
      );

      // 5. Deletar todas as tarefas associadas ao usuário
      console.log("🗑️ Deletando tarefas associadas...");
      const tasksQuery = query(
        collection(db, "tasks"),
        where("assignedTo", "==", selectedUserForDeletion)
      );
      const tasksDocs = await getDocs(tasksQuery);
      const taskDeletePromises = tasksDocs.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(taskDeletePromises);

      // 6. ✅ DELETAR DA COLEÇÃO USERS
      console.log("🗑️ Deletando da coleção users...");
      try {
        await deleteDoc(doc(db, "users", selectedUserForDeletion));
        console.log("✅ Removido da coleção users com sucesso!");
      } catch (error) {
        console.log("⚠️ Erro ao deletar usuário da coleção users:", error);
        throw error; // Relançar erro para interromper o processo
      }

      // 8. Não podemos deletar diretamente do Auth, então apenas remover da UI
      console.log("✅ Usuário removido do Firestore. Nota: O usuário ainda existe no Auth mas sem acesso aos dados.");

      // 9. Atualizar a UI
      console.log("🔄 Atualizando interface...");
      setCollaborators(prev => prev.filter(collab => collab.uid !== selectedUserForDeletion));
      toast.success("✅ Colaborador removido com sucesso do sistema!");
      setIsDeleteConfirmOpen(false);
      setSelectedUserForDeletion(null);

    } catch (error) {
      console.error("❌ Erro detalhado ao remover colaborador:", error);
      toast.error("Erro ao remover o colaborador. Por favor, tente novamente.");
    } finally {
      // 🔓 DESATIVAR MODO ADMINISTRATIVO
      disableAdministrativeMode();
    }
  };

  const handleViewCollaboratorDetails = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setIsDetailsDialogOpen(true);
  };

  const handleOpenAddDialog = () => {
    setNewCollaborator({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      whatsapp: "",
      password: "",
      birthDate: new Date(),
      hierarchyLevel: "Nível 5",
      uid: "",
      customPermissions: undefined
    });
    
    // Limpar estados das permissões
    setShowCustomPermissions(false);
    setCustomPermissions(null);
    
    setIsAddDialogOpen(true);
  };

  // Função para abrir o diálogo de edição
  const handleEditCollaborator = (collaborator: Collaborator) => {
    setEditingCollaborator({ ...collaborator });
    
    // Inicializar permissões customizadas se existirem
    if (collaborator.customPermissions) {
      setEditCustomPermissions(collaborator.customPermissions);
      setShowEditCustomPermissions(true);
    } else {
      setEditCustomPermissions(null);
      setShowEditCustomPermissions(false);
    }
    
    setIsEditDialogOpen(true);
  };

  // Função para alternar permissões customizadas na edição
  const toggleEditCustomPermissions = () => {
    if (!showEditCustomPermissions) {
      // Ao mostrar, inicializar com permissões atuais ou padrão
      const defaultPerms = editingCollaborator?.customPermissions || getDefaultPermissions(editingCollaborator?.hierarchyLevel || "Nível 5");
      setEditCustomPermissions(defaultPerms);
      if (editingCollaborator) {
        setEditingCollaborator(prev => prev ? { ...prev, customPermissions: defaultPerms } : null);
      }
    } else {
      // Ao ocultar, remover permissões customizadas
      setEditCustomPermissions(null);
      if (editingCollaborator) {
        setEditingCollaborator(prev => prev ? { ...prev, customPermissions: undefined } : null);
      }
    }
    setShowEditCustomPermissions(!showEditCustomPermissions);
  };

  // Função para alterar permissões na edição
  const handleEditPermissionChange = (permission: keyof CustomPermissions, value: boolean) => {
    if (!editCustomPermissions) return;
    
    const updatedPermissions = { ...editCustomPermissions, [permission]: value };
    setEditCustomPermissions(updatedPermissions);
    
    if (editingCollaborator) {
      setEditingCollaborator(prev => prev ? {
        ...prev,
        customPermissions: updatedPermissions
      } : null);
    }
  };

  // Função para atualizar colaborador
  const handleUpdateCollaborator = async () => {
    if (!editingCollaborator || !currentUserData?.hierarchyLevel) {
      toast.error("Dados insuficientes para atualização!");
      return;
    }

    if (!hasPermission(currentUserData.hierarchyLevel, 'manage_department')) {
      toast.error("Você não tem permissão para editar colaboradores!");
      return;
    }

    if (!canManageLevel(currentUserData.hierarchyLevel, editingCollaborator.hierarchyLevel)) {
      toast.error(`Você não pode editar usuários do nível: ${editingCollaborator.hierarchyLevel}`);
      return;
    }

    if (!editingCollaborator.firstName || !editingCollaborator.lastName || !editingCollaborator.email) {
      toast.error("Por favor, preencha todos os campos obrigatórios!");
      return;
    }

    try {
      setIsLoading(true);
      
      // 🔒 ATIVAR MODO ADMINISTRATIVO
      enableAdministrativeMode();
      
      console.log('📝 Iniciando atualização do colaborador:', editingCollaborator.id);

      // Buscar dados originais para comparação
      const originalCollaborator = collaborators.find(c => c.id === editingCollaborator.id);
      const changes: Record<string, { from: any; to: any }> = {};

      if (originalCollaborator) {
        // Detectar mudanças
        if (originalCollaborator.firstName !== editingCollaborator.firstName) {
          changes['Nome'] = { from: originalCollaborator.firstName, to: editingCollaborator.firstName };
        }
        if (originalCollaborator.lastName !== editingCollaborator.lastName) {
          changes['Sobrenome'] = { from: originalCollaborator.lastName, to: editingCollaborator.lastName };
        }
        if (originalCollaborator.email !== editingCollaborator.email) {
          changes['E-mail'] = { from: originalCollaborator.email, to: editingCollaborator.email };
        }
        if (originalCollaborator.hierarchyLevel !== editingCollaborator.hierarchyLevel) {
          changes['Nível Hierárquico'] = { from: originalCollaborator.hierarchyLevel, to: editingCollaborator.hierarchyLevel };
        }
        if (originalCollaborator.avatar !== editingCollaborator.avatar) {
          changes['Avatar'] = { 
            from: originalCollaborator.avatar || 'Sem avatar', 
            to: editingCollaborator.avatar || 'Sem avatar'
          };
        }
        if (JSON.stringify(originalCollaborator.customPermissions) !== JSON.stringify(editingCollaborator.customPermissions)) {
          changes['Permissões'] = { 
            from: originalCollaborator.customPermissions ? 'Customizadas' : 'Padrão', 
            to: editingCollaborator.customPermissions ? 'Customizadas' : 'Padrão'
          };
        }
      }

      // ✅ ATUALIZAR NA COLEÇÃO USERS
      const userDocRef = doc(db, 'users', editingCollaborator.uid);
      const userDoc = await getDoc(userDocRef);
      
      const updateData: any = {
        firstName: editingCollaborator.firstName,
        lastName: editingCollaborator.lastName,
        displayName: editingCollaborator.firstName,
        email: editingCollaborator.email,
        hierarchyLevel: editingCollaborator.hierarchyLevel,
        customPermissions: editingCollaborator.customPermissions || null,
        updatedAt: serverTimestamp()
      };
      
      // Incluir avatar se existir
      if (editingCollaborator.avatar) {
        updateData.avatar = editingCollaborator.avatar;
        updateData.photoURL = editingCollaborator.avatar;
      }
      
      if (userDoc.exists()) {
        console.log('💾 Atualizando coleção users...');
        await setDoc(userDocRef, updateData, { merge: true });
        console.log('✅ Coleção users atualizada com sucesso!');
      } else {
        console.log('⚠️ Usuário não encontrado na coleção users - criando entrada...');
        // Se não existir, criar
        await setDoc(userDocRef, {
          uid: editingCollaborator.uid,
          ...updateData,
          createdAt: serverTimestamp()
        });
      }

      // ✅ TAMBÉM ATUALIZAR NA COLEÇÃO COLLABORATORS_UNIFIED para sincronização
      const collaboratorUnifiedRef = doc(db, 'collaborators_unified', editingCollaborator.uid);
      const collaboratorUnifiedDoc = await getDoc(collaboratorUnifiedRef);
      
      const unifiedUpdateData: any = {
        firstName: editingCollaborator.firstName,
        lastName: editingCollaborator.lastName,
        updatedAt: new Date()
      };
      
      // Incluir avatar se existir
      if (editingCollaborator.avatar) {
        unifiedUpdateData.avatar = editingCollaborator.avatar;
        unifiedUpdateData.photoURL = editingCollaborator.avatar;
      }
      
      if (collaboratorUnifiedDoc.exists()) {
        console.log('💾 Atualizando coleção collaborators_unified...');
        await updateDoc(collaboratorUnifiedRef, unifiedUpdateData);
        console.log('✅ Coleção collaborators_unified atualizada com sucesso!');
      } else {
        console.log('⚠️ Usuário não encontrado na coleção collaborators_unified - criando entrada...');
        // Se não existir, criar com dados básicos
        await setDoc(collaboratorUnifiedRef, {
          uid: editingCollaborator.uid,
          ...unifiedUpdateData,
          email: editingCollaborator.email,
          hierarchyLevel: editingCollaborator.hierarchyLevel,
          createdAt: new Date()
        });
      }

      // Criar log de auditoria com detalhes das mudanças
      const changeDetails = Object.keys(changes).length > 0 
        ? `Campos alterados: ${Object.keys(changes).join(', ')}`
        : 'Dados do colaborador atualizados';

      console.log('📝 Criando log de auditoria...');
      await createAuditLog(
        "UPDATE_USER",
        `${editingCollaborator.firstName} ${editingCollaborator.lastName} - ${changeDetails}`,
        editingCollaborator.uid,
        changes
      );

      // Recarregar a lista completa do banco de dados para garantir que todos os dados estão atualizados
      await fetchCollaborators();

      toast.success("✅ Colaborador atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingCollaborator(null);
      setEditCustomPermissions(null);
      setShowEditCustomPermissions(false);

      console.log('✅ Atualização do colaborador concluída com sucesso!');

    } catch (error: any) {
      console.error('❌ Erro ao atualizar colaborador:', error);
      toast.error(`Erro ao atualizar colaborador: ${error.message}`);
    } finally {
      // 🔓 DESATIVAR MODO ADMINISTRATIVO
      disableAdministrativeMode();
      setIsLoading(false);
    }
  };

  // Função para abrir histórico
  const handleViewHistory = (collaborator: Collaborator) => {
    setSelectedCollaboratorForHistory(collaborator);
    setIsHistoryDialogOpen(true);
  };

  const renderCreateCollaboratorForm = () => (
    <Card className="shadow-md hover:shadow-lg transition-shadow mt-4">
      <CardHeader>
        <CardTitle>Adicionar Novo Colaborador</CardTitle>
        <CardDescription>
          Preencha os dados do novo colaborador. Você pode criar níveis: {getManagedLevels(currentUserData?.hierarchyLevel || "Nível 5").join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nome *</Label>
            <Input 
              id="firstName" 
              name="firstName" 
              value={newCollaborator.firstName}
              onChange={handleInputChange}
              placeholder="Digite o nome"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Sobrenome *</Label>
            <Input 
              id="lastName" 
              name="lastName" 
              value={newCollaborator.lastName}
              onChange={handleInputChange}
              placeholder="Digite o sobrenome"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              value={newCollaborator.email}
              onChange={handleInputChange}
              placeholder="Digite o e-mail"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              value={newCollaborator.password}
              onChange={handleInputChange}
              placeholder="Digite uma senha segura"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento *</Label>
            <div className="flex gap-2">
              <Input 
                id="birthDate" 
                name="birthDate" 
                type="date" 
                value={newCollaborator.birthDate ? format(newCollaborator.birthDate, "yyyy-MM-dd") : ''}
                onChange={handleDateInputChange}
                className="flex-1"
              />
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="px-2 w-10">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto">
                  <Calendar
                    mode="single"
                    selected={selectedDate || newCollaborator.birthDate}
                    onSelect={handleBirthDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hierarchyLevel">Nível Hierárquico *</Label>
            <Select 
              name="hierarchyLevel"
              value={newCollaborator.hierarchyLevel}
              onValueChange={handleHierarchyLevelChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent>
                {getManagedLevels(currentUserData?.hierarchyLevel || "Nível 5").map((level) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${getHierarchyColor(level)}`}>
                        {level}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getHierarchyDescription(newCollaborator.hierarchyLevel)}
            </p>
          </div>
          
          {/* Seção de Permissões Customizáveis */}
          {canManagePermissions(currentUserData?.hierarchyLevel || "Nível 5") && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Permissões Customizadas</Label>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={toggleCustomPermissions}
                >
                  {showCustomPermissions ? "Usar Padrão" : "Customizar"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {showCustomPermissions 
                  ? "Configure permissões específicas para este usuário" 
                  : "Usar permissões padrão do nível hierárquico"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAddCollaborator} disabled={isLoading}>
          {isLoading ? "Criando..." : "Criar Colaborador"}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Colaboradores</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie toda a equipe e defina níveis hierárquicos organizacionais
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Colaborador
          </Button>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo usuário. Todos os campos são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={newCollaborator.firstName}
                  onChange={handleInputChange}
                  placeholder="Nome"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={newCollaborator.lastName}
                  onChange={handleInputChange}
                  placeholder="Sobrenome"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={newCollaborator.email}
                onChange={handleInputChange}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={newCollaborator.phone || ""}
                  onChange={handleInputChange}
                  placeholder="(61) 99999-9999"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  value={newCollaborator.whatsapp || ""}
                  onChange={handleInputChange}
                  placeholder="5561999999999"
                />
                <p className="text-xs text-muted-foreground">
                  Digite com código do país (Ex: 5561999999999)
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={newCollaborator.password}
                onChange={handleInputChange}
                placeholder="Senha (mínimo 6 caracteres)"
                minLength={6}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                value={newCollaborator.birthDate instanceof Date ? newCollaborator.birthDate.toISOString().split('T')[0] : ''}
                onChange={handleDateInputChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hierarchyLevel">Nível Hierárquico</Label>
              <Select 
                name="hierarchyLevel"
                value={newCollaborator.hierarchyLevel}
                onValueChange={handleHierarchyLevelChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {getManagedLevels(currentUserData?.hierarchyLevel || "Nível 5").map((level) => (
                    <SelectItem key={level} value={level}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${getHierarchyColor(level)}`}>
                          {level}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Seção de Permissões Detalhadas */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Permissões do Nível Selecionado</Label>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasPermission(newCollaborator.hierarchyLevel, 'manage_department') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>Gerenciar Departamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasPermission(newCollaborator.hierarchyLevel, 'approve_expenses') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>Aprovar Despesas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasPermission(newCollaborator.hierarchyLevel, 'view_financial_reports') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>Ver Relatórios Financeiros</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasPermission(newCollaborator.hierarchyLevel, 'view_all_tasks') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>Ver Todas as Tarefas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasPermission(newCollaborator.hierarchyLevel, 'chatbot_access') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>Acesso ao ChatBot</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasPermission(newCollaborator.hierarchyLevel, 'settings_access') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>Acesso às Configurações</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {getHierarchyDescription(newCollaborator.hierarchyLevel)}
              </p>
            </div>
            
            {/* Seção de Permissões Customizáveis */}
            {canManagePermissions(currentUserData?.hierarchyLevel || "Nível 5") && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Permissões Customizadas</Label>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={toggleCustomPermissions}
                  >
                    {showCustomPermissions ? "Usar Padrão" : "Customizar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {showCustomPermissions 
                    ? "Configure permissões específicas para este usuário" 
                    : "Usar permissões padrão do nível hierárquico"}
                </p>
              </div>
            )}
            
            {/* Gerenciador de Permissões */}
            {showCustomPermissions && customPermissions && (
              <div className="mt-4">
                <PermissionsManager
                  permissions={customPermissions}
                  onPermissionChange={handlePermissionChange}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCollaborator} disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista de Colaboradores */}
      <div className="bg-white dark:bg-card rounded-lg shadow h-[600px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Nome</TableHead>
              <TableHead className="text-center">E-mail</TableHead>
              <TableHead className="text-center">Nível Hierárquico</TableHead>
              <TableHead className="text-center">Data de Criação</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCollaborators.map((collaborator) => (
              <TableRow key={collaborator.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      {collaborator.avatar && collaborator.avatar.trim() !== "" ? (
                        <AvatarImage 
                          src={collaborator.avatar} 
                          alt={`${collaborator.firstName} ${collaborator.lastName || ''}`}
                          onError={(e) => {
                            // Se a imagem falhar ao carregar, esconder o erro e mostrar o fallback
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <AvatarFallback>
                        {collaborator.firstName?.charAt(0).toUpperCase() || ''}{collaborator.lastName?.charAt(0).toUpperCase() || ''}
                      </AvatarFallback>
                    </Avatar>
                    <span 
                      className="truncate" 
                      title={`${collaborator.firstName} ${collaborator.lastName || ''}`.trim()}
                      style={{ maxWidth: '20ch', display: 'inline-block' }}
                    >
                      {(() => {
                        const fullName = `${collaborator.firstName} ${collaborator.lastName || ''}`.trim();
                        return fullName.length > 20 ? `${fullName.substring(0, 20)}...` : fullName;
                      })()}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span 
                    className="truncate" 
                    title={collaborator.email}
                    style={{ maxWidth: '20ch', display: 'inline-block' }}
                  >
                    {collaborator.email && collaborator.email.length > 20 
                      ? `${collaborator.email.substring(0, 20)}...`
                      : collaborator.email}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHierarchyColor(collaborator.hierarchyLevel || "Nível 5")}`}>
                      {collaborator.hierarchyLevel || "Nível 5"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{collaborator.createdAt ? new Date(collaborator.createdAt).toLocaleDateString('pt-BR') : 'N/D'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleViewCollaboratorDetails(collaborator)}
                        className="cursor-pointer"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleViewHistory(collaborator)}
                        className="cursor-pointer"
                      >
                        <History className="mr-2 h-4 w-4" />
                        Ver histórico
                      </DropdownMenuItem>
                      {(() => {
                        const canManage = hasPermission(currentUserData?.hierarchyLevel || "Nível 5", 'manage_department');
                        console.log("🔍 CollaboratorManagement - Verificação de permissão:", {
                          currentUserData: currentUserData,
                          hierarchyLevel: currentUserData?.hierarchyLevel,
                          canManage: canManage,
                          colaboradorEditando: collaborator.firstName
                        });
                        return canManage;
                      })() && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleEditCollaborator(collaborator)}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar colaborador
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteCollaborator(collaborator.id, collaborator.uid)}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir colaborador
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de confirmação de exclusão */}
      <ConfirmationDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Confirmar Exclusão do Colaborador"
        description="Você tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita e removerá permanentemente todos os dados relacionados."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        variant="destructive"
      />

      {/* Diálogo de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>
              Edite os dados do colaborador. Nem todos os campos podem ser alterados.
            </DialogDescription>
          </DialogHeader>
          {editingCollaborator && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-firstName">Nome</Label>
                  <Input
                    id="edit-firstName"
                    value={editingCollaborator.firstName}
                    onChange={(e) => setEditingCollaborator(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                    placeholder="Nome"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-lastName">Sobrenome</Label>
                  <Input
                    id="edit-lastName"
                    value={editingCollaborator.lastName}
                    onChange={(e) => setEditingCollaborator(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                    placeholder="Sobrenome"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingCollaborator.email}
                  onChange={(e) => setEditingCollaborator(prev => prev ? { ...prev, email: e.target.value } : null)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editingCollaborator.phone || ''}
                    onChange={(e) => setEditingCollaborator(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                  <Input
                    id="edit-whatsapp"
                    type="tel"
                    value={editingCollaborator.whatsapp || ''}
                    onChange={(e) => setEditingCollaborator(prev => prev ? { ...prev, whatsapp: e.target.value } : null)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
                <Input
                  id="edit-birthDate"
                  type="date"
                  value={editingCollaborator.birthDate instanceof Date ? editingCollaborator.birthDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                      const newDate = new Date(dateValue);
                      setEditingCollaborator(prev => prev ? { ...prev, birthDate: newDate } : null);
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-hierarchyLevel">Nível Hierárquico</Label>
                <Select 
                  value={editingCollaborator.hierarchyLevel}
                  onValueChange={(value: HierarchyLevel) => {
                    setEditingCollaborator(prev => prev ? { ...prev, hierarchyLevel: value } : null);
                    
                    // Atualizar permissões se estiver mostrando customizações
                    if (showEditCustomPermissions) {
                      const defaultPerms = getDefaultPermissions(value);
                      setEditCustomPermissions(defaultPerms);
                      setEditingCollaborator(prev => prev ? { ...prev, customPermissions: defaultPerms } : null);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    {getManagedLevels(currentUserData?.hierarchyLevel || "Nível 5").map((level) => (
                      <SelectItem key={level} value={level}>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${getHierarchyColor(level)}`}>
                            {level}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Seção de Permissões Detalhadas */}
              <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Permissões do Nível Selecionado</Label>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hasPermission(editingCollaborator.hierarchyLevel, 'manage_department') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span>Gerenciar Departamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hasPermission(editingCollaborator.hierarchyLevel, 'approve_expenses') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span>Aprovar Despesas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hasPermission(editingCollaborator.hierarchyLevel, 'view_financial_reports') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span>Ver Relatórios Financeiros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hasPermission(editingCollaborator.hierarchyLevel, 'view_all_tasks') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span>Ver Todas as Tarefas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hasPermission(editingCollaborator.hierarchyLevel, 'chatbot_access') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span>Acesso ao ChatBot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hasPermission(editingCollaborator.hierarchyLevel, 'settings_access') ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span>Acesso às Configurações</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {getHierarchyDescription(editingCollaborator.hierarchyLevel)}
                </p>
              </div>
              
              {/* Seção de Permissões Customizáveis */}
              {canManagePermissions(currentUserData?.hierarchyLevel || "Nível 5") && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Permissões Customizadas</Label>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={toggleEditCustomPermissions}
                    >
                      {showEditCustomPermissions ? "Usar Padrão" : "Customizar"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {showEditCustomPermissions 
                      ? "Configure permissões específicas para este usuário" 
                      : "Usar permissões padrão do nível hierárquico"}
                  </p>
                </div>
              )}
              
              {/* Gerenciador de Permissões para Edição */}
              {showEditCustomPermissions && editCustomPermissions && (
                <div className="mt-4">
                  <PermissionsManager
                    permissions={editCustomPermissions}
                    onPermissionChange={handleEditPermissionChange}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setEditingCollaborator(null);
              setEditCustomPermissions(null);
              setShowEditCustomPermissions(false);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCollaborator} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Histórico */}
      {selectedCollaboratorForHistory && (
        <HistoryDialog
          isOpen={isHistoryDialogOpen}
          onOpenChange={setIsHistoryDialogOpen}
          entityId={selectedCollaboratorForHistory.uid}
          entityType="collaborator"
          entityName={`${selectedCollaboratorForHistory.firstName} ${selectedCollaboratorForHistory.lastName}`}
        />
      )}

      {/* Diálogo de Detalhes do Colaborador */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Colaborador</DialogTitle>
            <DialogDescription>
              Informações completas do colaborador selecionado
            </DialogDescription>
          </DialogHeader>
          {selectedCollaborator && (
            <div className="space-y-6">
              {/* Cabeçalho com foto e nome */}
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage 
                    src={selectedCollaborator.avatar} 
                    alt={`${selectedCollaborator.firstName} ${selectedCollaborator.lastName}`} 
                  />
                  <AvatarFallback className="text-lg font-semibold">
                    {selectedCollaborator.firstName.charAt(0).toUpperCase()}
                    {selectedCollaborator.lastName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedCollaborator.firstName} {selectedCollaborator.lastName}
                  </h3>
                  <p className="text-muted-foreground">{selectedCollaborator.email}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getHierarchyColor(selectedCollaborator.hierarchyLevel)}`}>
                    {selectedCollaborator.hierarchyLevel}
                  </span>
                </div>
              </div>

              {/* Informações pessoais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nome Completo</Label>
                    <p className="text-sm">{selectedCollaborator.firstName} {selectedCollaborator.lastName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">E-mail</Label>
                    <p className="text-sm">{selectedCollaborator.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                    <p className="text-sm">{selectedCollaborator.phone || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">WhatsApp</Label>
                    <p className="text-sm">{selectedCollaborator.whatsapp || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data de Nascimento</Label>
                    <p className="text-sm">
                      {selectedCollaborator.birthDate 
                        ? new Date(selectedCollaborator.birthDate).toLocaleDateString('pt-BR')
                        : 'Não informado'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nível Hierárquico</Label>
                    <p className="text-sm">{selectedCollaborator.hierarchyLevel}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getHierarchyDescription(selectedCollaborator.hierarchyLevel)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data de Criação</Label>
                    <p className="text-sm">
                      {selectedCollaborator.createdAt 
                        ? new Date(selectedCollaborator.createdAt).toLocaleDateString('pt-BR')
                        : 'Não informado'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Última Atualização</Label>
                    <p className="text-sm">
                      {selectedCollaborator.updatedAt 
                        ? new Date(selectedCollaborator.updatedAt).toLocaleDateString('pt-BR')
                        : 'Não informado'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Fechar
            </Button>
            {selectedCollaborator && hasPermission(currentUserData?.hierarchyLevel || "Nível 5", 'manage_department') && (
              <Button onClick={() => {
                setIsDetailsDialogOpen(false);
                handleEditCollaborator(selectedCollaborator);
              }}>
                Editar Colaborador
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
