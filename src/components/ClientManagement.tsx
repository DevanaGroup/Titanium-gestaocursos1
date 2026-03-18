import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash2, Eye, Upload, Download, FileText, Building, Users, UserCheck, History, MoreHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { db, FUNCTIONS_BASE_URL } from "@/config/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where, serverTimestamp, FieldValue, setDoc } from "firebase/firestore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { createDocument, getFoldersByClient, getSubfoldersByParent, type Folder, uploadFileToStorage, createDefaultFoldersForClient } from "@/services/folderService";
import { getCollaborators } from "@/services/collaboratorService";
import { getClients, updateClient, deleteClient } from "@/services/clientService";
import { syncSingleClientWithFinancialClient } from "@/services/financialCoreService";
import { Client, ClientStatus } from "@/types";
import { auth } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { hasPermission } from "@/utils/hierarchyUtils";
import { HierarchyLevel } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

// Interface local para compatibilidade com o componente
interface LocalClient extends Client {
  lastUpdate: string;
}

interface LocalCollaborator {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const ClientManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [clients, setClients] = useState<LocalClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para os diálogos de ações
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDocumentsDialogOpen, setIsDocumentsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<LocalClient | null>(null);
  
  const [editClient, setEditClient] = useState<Omit<LocalClient, 'id' | 'lastUpdate' | 'createdAt' | 'updatedAt'>>({
    name: "",
    project: "",
    status: "Em andamento",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    assignedTo: "",
    assignedToName: "",
    cpf: "",
    cnpj: "",
    documents: []
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  
  // Novo cliente form state
  const [newClient, setNewClient] = useState<Omit<LocalClient, 'id' | 'lastUpdate' | 'createdAt' | 'updatedAt'>>({
    name: "",
    project: "",
    status: "Em andamento",
    contactName: "",
    email: "",
    phone: "",
    assignedTo: "",
    assignedToName: "",
    address: "",
    cpf: "",
    cnpj: "",
    documents: []
  });

  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [subfolders, setSubfolders] = useState<Folder[]>([]);
  const [selectedSubfolder, setSelectedSubfolder] = useState<string>("");
  const [selectedMainFolder, setSelectedMainFolder] = useState<Folder | null>(null);

  const [collaborators, setCollaborators] = useState<LocalCollaborator[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Estados para controle de usuário e role
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Estados para controle dos diálogos de confirmação
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<LocalClient | null>(null);
  const [clientToEdit, setClientToEdit] = useState<LocalClient | null>(null);

  // Efeito para obter o usuário atual e seu role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setCurrentUserId(user.uid);

        try {
          // Buscar dados do usuário no Firestore - priorizar coleção unificada
          let userData = null;
          
          // Tentar buscar na coleção unificada primeiro
          const unifiedDoc = await getDoc(doc(db, "collaborators_unified", user.uid));
          if (unifiedDoc.exists()) {
            userData = unifiedDoc.data();
            console.log("🔍 ClientManagement - Dados do usuário (unified):", userData);
          } else {
            // Fallback para coleção collaborators
            const userDoc = await getDoc(doc(db, "collaborators_unified", user.uid));
            
            if (userDoc.exists()) {
              userData = userDoc.data();
              console.log("🔍 ClientManagement - Dados do usuário (collaborators):", userData);
            } else {
              // Se não encontrou na coleção unificada, definir dados padrão
              console.log("❌ ClientManagement - Usuário não encontrado na coleção unificada");
            }
          }

          if (userData) {
            setUserRole(userData.hierarchyLevel || 'Estagiário/Auxiliar');
            console.log("🔍 ClientManagement - Usuário logado:", user.email, "Role:", userData.hierarchyLevel);
          } else {
            setUserRole('Estagiário/Auxiliar');
            console.log("⚠️ ClientManagement - Nenhum dados de usuário encontrado, usando role padrão");
          }
        } catch (error) {
          console.error("❌ ClientManagement - Erro ao buscar dados do usuário:", error);
          setUserRole('Estagiário/Auxiliar');
        }
      } else {
        setCurrentUser(null);
        setUserRole('');
        setCurrentUserId('');
      }
    });

    return () => unsubscribe();
  }, []);

  // Buscar clientes do Firebase
  useEffect(() => {
    if (!currentUser || !userRole) return; // Aguardar usuário e role serem carregados

    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log("🔍 Iniciando busca de clientes...");
        console.log("👤 Usuário atual:", currentUser.email, "Role:", userRole, "ID:", currentUserId);
        
        // Buscar clientes do Firebase
        const clientsData = await getClients();
        console.log("📊 Clientes encontrados no Firebase:", clientsData);
        console.log("📈 Quantidade de clientes:", clientsData.length);
        
        // Log detalhado dos clientes encontrados
        if (clientsData.length === 0) {
          console.log("❌ NENHUM CLIENTE ENCONTRADO na base de dados");
          console.log("💡 Possíveis motivos:");
          console.log("   - Não há clientes cadastrados");
          console.log("   - Problemas de conexão com Firebase");
          console.log("   - Permissões do Firestore");
        } else {
          console.log("✅ Clientes encontrados na base:");
          clientsData.forEach((client, index) => {
            console.log(`   ${index + 1}. ${client.name} - ${client.project} (assignedTo: ${client.assignedTo})`);
          });
        }
        
        // Filtrar clientes baseado no role do usuário
        let filteredClientsData = clientsData;
        
        // Verificar se o usuário tem permissão para gerenciar departamento (ver todos os clientes)
        const canViewAllClients = hasPermission(userRole as HierarchyLevel, 'manage_department');
        
        if (!canViewAllClients) {
          // Para níveis hierárquicos sem permissão de gerenciamento, mostrar apenas clientes atribuídos a eles
          filteredClientsData = clientsData.filter(client => {
            const isAssigned = client.assignedTo === currentUserId;
            console.log(`🔍 Cliente ${client.name}: assignedTo=${client.assignedTo}, currentUserId=${currentUserId}, isAssigned=${isAssigned}`);
            return isAssigned;
          });
          console.log(`🎯 Clientes filtrados para ${userRole} ${currentUser.email}:`, filteredClientsData.length);
        } else {
          console.log(`👑 Usuário ${userRole} tem permissão de gerenciamento - mostrando TODOS os ${clientsData.length} clientes`);
          console.log('📋 Lista completa de clientes:');
          clientsData.forEach((client, index) => {
            console.log(`   ${index + 1}. ${client.name} - ${client.project} (${client.assignedTo ? 'atribuído' : 'não atribuído'})`);
          });
        }
        
        // Converter para LocalClient format
        const localClients: LocalClient[] = filteredClientsData.map(client => ({
          ...client,
          lastUpdate: client.updatedAt?.toLocaleDateString('pt-BR') || new Date().toLocaleDateString('pt-BR'),
          assignedTo: client.assignedTo || "",
          assignedToName: client.assignedToName || "",
          documents: client.documents || []
        }));
        
        console.log("🔄 Clientes convertidos para formato local:", localClients);
        setClients(localClients);
        
        // Buscar colaboradores para o dropdown de atribuição
        console.log("👥 Buscando colaboradores...");
        const collaboratorsData = await getCollaborators();
        console.log("👥 Colaboradores encontrados:", collaboratorsData);
        
        // Converter para LocalCollaborator format
        const localCollaborators: LocalCollaborator[] = collaboratorsData.map(collab => ({
          id: collab.id,
          name: collab.firstName || '',
          email: collab.email,
          role: collab.hierarchyLevel
        }));
        
        console.log("🔄 Colaboradores convertidos:", localCollaborators);
        setCollaborators(localCollaborators);
        
        console.log("✅ Carregamento concluído com sucesso!");
      } catch (error) {
        console.error("❌ Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados dos clientes existentes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, userRole, currentUserId]); // Reexecutar quando usuário ou role mudarem

  const filteredClients = clients.filter(client => 
    (client.name && client.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (client.project && client.project.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Cálculos de paginação
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Resetar página quando o termo de busca mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Função para criar log de auditoria para clientes
  const createClientAuditLog = async (action: string, details: string, clientId: string, changes?: Record<string, { from: any; to: any }>) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Buscar nome do usuário atual na coleção unificada
      let currentUserName = 'Usuário desconhecido';
      try {
        const currentUserDoc = await getDoc(doc(db, 'collaborators_unified', currentUser.uid));
        if (currentUserDoc.exists()) {
          const userData = currentUserDoc.data();
          // Mostrar apenas o firstName
          currentUserName = userData?.firstName || currentUser.email || 'Usuário desconhecido';
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário para auditoria:', error);
      }

      const auditLog = {
        action,
        performedBy: currentUser.uid,
        performedByName: currentUserName,
        performedOn: clientId,
        timestamp: serverTimestamp(),
        details,
        entityType: 'client',
        changes: changes || {}
      };

      await addDoc(collection(db, 'auditLogs'), auditLog);
    } catch (error) {
      console.error('Erro ao criar log de auditoria para cliente:', error);
    }
  };

  // Funções de formatação para CPF e CNPJ
  const formatCPF = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const formatCNPJ = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  // Função para lidar com mudanças de input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewClient(prev => ({ ...prev, [name]: value }));
  };

  // Função para lidar com campo unificado CPF/CNPJ
  const handleDocumentChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    // Se tem mais de 11 dígitos, é CNPJ
    if (numbers.length > 11) {
      const formatted = formatCNPJ(value);
      setNewClient(prev => ({ 
        ...prev, 
        cnpj: formatted,
        cpf: "" // Limpar CPF se for CNPJ
      }));
    } else {
      // Se tem 11 ou menos dígitos, é CPF
      const formatted = formatCPF(value);
      setNewClient(prev => ({ 
        ...prev, 
        cpf: formatted,
        cnpj: "" // Limpar CNPJ se for CPF
      }));
    }
  };

  // Função para lidar com campo unificado CPF/CNPJ no formulário de edição
  const handleEditDocumentChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    // Se tem mais de 11 dígitos, é CNPJ
    if (numbers.length > 11) {
      const formatted = formatCNPJ(value);
      setEditClient(prev => ({ 
        ...prev, 
        cnpj: formatted,
        cpf: "" // Limpar CPF se for CNPJ
      }));
    } else {
      // Se tem 11 ou menos dígitos, é CPF
      const formatted = formatCPF(value);
      setEditClient(prev => ({ 
        ...prev, 
        cpf: formatted,
        cnpj: "" // Limpar CNPJ se for CPF
      }));
    }
  };

  // Função para obter o valor do documento unificado (para exibição)
  const getDocumentValue = (cpf?: string, cnpj?: string): string => {
    return cnpj || cpf || "";
  };

  // Função para lidar com mudanças de select
  const handleSelectChange = (value: string) => {
    setNewClient(prev => ({ ...prev, status: value as ClientStatus }));
  };

  // Função para adicionar novo cliente (com auditoria)
  const handleAddClient = async () => {
    // Validação dos campos obrigatórios
    if (!newClient.name || !newClient.project) {
      toast.error("Por favor, preencha o nome da empresa e o projeto!");
      return;
    }

    if (!newClient.phone) {
      toast.error("Por favor, preencha o telefone!");
      return;
    }

    if (!newClient.cpf && !newClient.cnpj) {
      toast.error("Por favor, preencha o CPF ou CNPJ!");
      return;
    }

    // Validar email (obrigatório)
    if (!newClient.email || newClient.email.trim() === "") {
      toast.error("Por favor, preencha o e-mail do cliente! O e-mail é obrigatório.");
      return;
    }

    try {
      setIsLoading(true);
      
      const clientData = {
        ...newClient,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, "clients"), clientData);
      
      // Sincronizar automaticamente com dados financeiros
      console.log("🔄 Sincronizando novo cliente com dados financeiros...");
      await syncSingleClientWithFinancialClient(docRef.id);
      
      // Criar conta de acesso automaticamente
      try {
        toast.info("Criando conta de acesso do cliente...");
        
        const defaultPassword = "Cerrado@2025";
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          throw new Error("Usuário não autenticado");
        }

        // 1. Criar usuário no Firebase Auth via função cloud
        const token = await currentUser.getIdToken();
        
        const createUserResponse = await fetch(`${FUNCTIONS_BASE_URL}/createUserAuth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            email: newClient.email,
            password: defaultPassword,
            firstName: newClient.contactName || newClient.name.split(' ')[0] || 'Cliente',
            lastName: newClient.name.split(' ').slice(1).join(' ') || '',
            hierarchyLevel: 'Cliente'
          })
        });

        if (!createUserResponse.ok) {
          const errorData = await createUserResponse.json();
          throw new Error(errorData.error || 'Erro ao criar usuário no Auth');
        }

        const authResult = await createUserResponse.json();
        const newUserId = authResult.uid;
        
        // 2. Criar registro na coleção collaborators_unified
        const collaboratorData = {
          uid: newUserId,
          email: newClient.email,
          firstName: newClient.contactName || newClient.name.split(' ')[0] || 'Cliente',
          lastName: newClient.name.split(' ').slice(1).join(' ') || '',
          displayName: newClient.contactName || newClient.name,
          phone: newClient.phone || "",
          whatsapp: newClient.phone || "",
          hierarchyLevel: 'Cliente',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          photoURL: null
        };
        
        console.log("📝 ClientManagement - Criando registro em collaborators_unified:", collaboratorData);
        await setDoc(doc(db, 'collaborators_unified', newUserId), collaboratorData);
        console.log("✅ ClientManagement - Registro criado com sucesso em collaborators_unified");
        
        // Verificar se foi criado corretamente
        const verifyDoc = await getDoc(doc(db, 'collaborators_unified', newUserId));
        if (verifyDoc.exists()) {
          const verifyData = verifyDoc.data();
          console.log("✅ ClientManagement - Verificação: registro existe com hierarchyLevel:", verifyData.hierarchyLevel);
        } else {
          console.error("❌ ClientManagement - ERRO: registro não foi criado em collaborators_unified");
        }

        // 3. Vincular collaboratorId ao cliente
        await updateDoc(docRef, {
          collaboratorId: newUserId
        });

        // Criar log de auditoria para criação da conta
        await createClientAuditLog(
          "CREATE_CLIENT_ACCOUNT",
          `Conta de acesso criada automaticamente para o cliente "${newClient.name}". Senha padrão: ${defaultPassword}`,
          docRef.id
        );

        toast.success("✅ Conta de acesso criada automaticamente!");
      } catch (accountError: any) {
        console.error("Erro ao criar conta de acesso:", accountError);
        toast.warning(`Cliente criado, mas houve erro ao criar a conta: ${accountError.message}. Você pode criar a conta manualmente depois.`);
      }
      
      // Criar log de auditoria
      await createClientAuditLog(
        "CREATE_CLIENT",
        `Cliente "${newClient.name}" criado para o projeto "${newClient.project}"`,
        docRef.id
      );
      
      // Buscar dados atualizados
      const clientsData = await getClients();
      
      // Aplicar filtros baseados no role do usuário
      const canViewAllClients = hasPermission(userRole as HierarchyLevel, 'manage_department');
      let filteredClientsData = clientsData;
      
      if (!canViewAllClients) {
        // Usuários sem permissão de gestão veem apenas clientes atribuídos a eles
        filteredClientsData = clientsData.filter(client => client.assignedTo === currentUserId);
        console.log("🔒 Usuário sem permissão de gestão. Clientes filtrados:", filteredClientsData.length);
      } else {
        console.log("🔓 Usuário com permissão de gestão. Mostrando TODOS os clientes:", filteredClientsData.length);
        console.log('📋 Clientes após adicionar novo:');
        filteredClientsData.forEach((client, index) => {
          console.log(`   ${index + 1}. ${client.name} - ${client.project}`);
        });
      }
      
      const mappedClients = filteredClientsData.map(client => ({
        ...client,
        lastUpdate: client.updatedAt && typeof client.updatedAt === 'object' && 'seconds' in client.updatedAt ? 
          format(new Date((client.updatedAt as any).seconds * 1000), 'dd/MM/yyyy', { locale: ptBR }) : 
          (client.updatedAt ? format(new Date(client.updatedAt as any), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A')
      }));
      
      setClients(mappedClients);
      
      // Limpar formulário
      setNewClient({
        name: "",
        project: "",
        status: "Em andamento",
        contactName: "",
        email: "",
        phone: "",
        assignedTo: "",
        assignedToName: "",
        address: "",
        cpf: "",
        cnpj: "",
        documents: []
      });
      
      setIsAddDialogOpen(false);
      toast.success("Cliente adicionado com sucesso! Conta de acesso criada automaticamente com senha padrão: Cerrado@2025", {
        duration: 8000,
        description: "O cliente poderá alterar a senha no primeiro acesso."
      });
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      toast.error("Erro ao adicionar cliente. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      // Buscar dados do cliente antes de deletar para auditoria
      const clientToDelete = clients.find(client => client.id === id);
      
      if (!clientToDelete) {
        toast.error("Cliente não encontrado");
        return;
      }

      // Se o cliente tiver collaboratorId, deletar também da coleção collaborators_unified
      if (clientToDelete.collaboratorId) {
        try {
          const collaboratorRef = doc(db, 'collaborators_unified', clientToDelete.collaboratorId);
          await deleteDoc(collaboratorRef);
          console.log("✅ Registro do colaborador deletado da coleção collaborators_unified");
        } catch (collaboratorError) {
          console.error("⚠️ Erro ao deletar registro do colaborador:", collaboratorError);
          // Não bloquear a exclusão do cliente se houver erro ao deletar o colaborador
          toast.warning("Cliente removido, mas houve erro ao remover conta de acesso");
        }
      }

      // Deletar o cliente da coleção clients
      await deleteClient(id);
      
      // Criar log de auditoria
      await createClientAuditLog(
        "DELETE_CLIENT",
        `Cliente "${clientToDelete.name}" (Projeto: ${clientToDelete.project}) foi removido do sistema`,
        id
      );
      
      setClients(prev => prev.filter(client => client.id !== id));
      toast.success("Cliente removido com sucesso!");
    } catch (error) {
      console.error("Erro ao remover cliente:", error);
      toast.error("Não foi possível remover o cliente");
    }
  };

  // Função para criar contas de acesso para clientes antigos (em massa)
  const handleCreateAccountsForOldClients = async () => {
    try {
      setIsLoading(true);
      toast.info("Buscando clientes sem conta de acesso...");

      // Buscar todos os clientes e filtrar os que não têm collaboratorId e têm email
      // O Firestore não permite query por campo vazio/undefined, então buscamos todos e filtramos
      const allClientsSnapshot = await getDocs(collection(db, 'clients'));
      const clientsWithoutAccount = allClientsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as LocalClient))
        .filter(client => (!client.collaboratorId || client.collaboratorId === '') && client.email);

      if (clientsWithoutAccount.length === 0) {
        toast.success("Todos os clientes já possuem conta de acesso!");
        setIsLoading(false);
        return;
      }

      toast.info(`Encontrados ${clientsWithoutAccount.length} clientes sem conta. Criando contas...`);

      const defaultPassword = "Cerrado@2025";
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const client of clientsWithoutAccount) {
        try {
          const currentUser = auth.currentUser;
          if (!currentUser) {
            throw new Error("Usuário não autenticado");
          }

          // 1. Criar usuário no Firebase Auth via função cloud
          const token = await currentUser.getIdToken();
          
          const createUserResponse = await fetch(`${FUNCTIONS_BASE_URL}/createUserAuth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              email: client.email,
              password: defaultPassword,
              firstName: client.contactName || client.name.split(' ')[0] || 'Cliente',
              lastName: client.name.split(' ').slice(1).join(' ') || '',
              hierarchyLevel: 'Cliente'
            })
          });

          if (!createUserResponse.ok) {
            const errorData = await createUserResponse.json();
            throw new Error(errorData.error || 'Erro ao criar usuário no Auth');
          }

          const authResult = await createUserResponse.json();
          const newUserId = authResult.uid;
          
          // 2. Criar registro na coleção collaborators_unified
          await setDoc(doc(db, 'collaborators_unified', newUserId), {
            uid: newUserId,
            email: client.email,
            firstName: client.contactName || client.name.split(' ')[0] || 'Cliente',
            lastName: client.name.split(' ').slice(1).join(' ') || '',
            displayName: client.contactName || client.name,
            phone: client.phone || "",
            whatsapp: client.phone || "",
            hierarchyLevel: 'Cliente',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            photoURL: null
          });

          // 3. Vincular collaboratorId ao cliente
          await updateDoc(doc(db, 'clients', client.id), {
            collaboratorId: newUserId
          });

          // Criar log de auditoria
          await createClientAuditLog(
            "CREATE_CLIENT_ACCOUNT",
            `Conta de acesso criada automaticamente para o cliente "${client.name}". Senha padrão: ${defaultPassword}`,
            client.id
          );

          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(`${client.name}: ${error.message}`);
          console.error(`Erro ao criar conta para ${client.name}:`, error);
        }
      }

      // Atualizar lista de clientes
      const clientsData = await getClients();
      const canViewAllClients = hasPermission(userRole as HierarchyLevel, 'manage_department');
      let filteredClientsData = clientsData;
      
      if (!canViewAllClients) {
        filteredClientsData = clientsData.filter(c => c.assignedTo === currentUserId);
      }
      
      const mappedClients = filteredClientsData.map(c => ({
        ...c,
        lastUpdate: c.updatedAt && typeof c.updatedAt === 'object' && 'seconds' in c.updatedAt ? 
          format(new Date((c.updatedAt as any).seconds * 1000), 'dd/MM/yyyy', { locale: ptBR }) : 
          (c.updatedAt ? format(new Date(c.updatedAt as any), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A')
      }));
      
      setClients(mappedClients);

      if (errorCount > 0) {
        toast.warning(`Contas criadas: ${successCount}. Erros: ${errorCount}`, {
          description: errors.slice(0, 3).join(', '),
          duration: 8000
        });
      } else {
        toast.success(`✅ ${successCount} conta(s) criada(s) com sucesso! Senha padrão: Cerrado@2025`, {
          duration: 8000,
          description: "Os clientes poderão alterar a senha no primeiro acesso."
        });
      }
    } catch (error: any) {
      console.error("Erro ao criar contas para clientes antigos:", error);
      toast.error(`Erro ao criar contas: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para criar conta do cliente (mantida para compatibilidade, mas não é mais usada no menu)
  const handleCreateClientAccount = async (client: LocalClient) => {
    // Verificar se já tem conta
    if (client.collaboratorId) {
      toast.info("Este cliente já possui uma conta criada!");
      return;
    }

    // Verificar se tem email
    if (!client.email) {
      toast.error("O cliente precisa ter um e-mail cadastrado para criar a conta!");
      return;
    }

    try {
      setIsLoading(true);
      toast.info("Criando conta do cliente...");

      // Gerar senha temporária
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!@#";

      // 1. Criar usuário no Firebase Auth via função cloud
      const token = await currentUser.getIdToken();
      
      const createUserResponse = await fetch('https://us-central1-cerrado-engenharia.cloudfunctions.net/createUserAuth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: client.email,
          password: tempPassword,
          firstName: client.contactName || client.name.split(' ')[0] || 'Cliente',
          lastName: client.name.split(' ').slice(1).join(' ') || '',
          hierarchyLevel: 'Cliente'
        })
      });

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        throw new Error(errorData.error || 'Erro ao criar usuário no Auth');
      }

      const authResult = await createUserResponse.json();
      const newUserId = authResult.uid;
      
      toast.success("Usuário criado no sistema de autenticação!");

      // 2. Criar registro na coleção collaborators_unified
      await setDoc(doc(db, 'collaborators_unified', newUserId), {
        uid: newUserId,
        email: client.email,
        firstName: client.contactName || client.name.split(' ')[0] || 'Cliente',
        lastName: client.name.split(' ').slice(1).join(' ') || '',
        displayName: client.contactName || client.name,
        phone: client.phone || "",
        whatsapp: client.phone || "",
        hierarchyLevel: 'Cliente',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        photoURL: null
      });

      // 3. Vincular collaboratorId ao cliente
      await updateClient(client.id, {
        collaboratorId: newUserId
      });

      // 4. Atualizar lista de clientes
      const clientsData = await getClients();
      const canViewAllClients = hasPermission(userRole as HierarchyLevel, 'manage_department');
      let filteredClientsData = clientsData;
      
      if (!canViewAllClients) {
        filteredClientsData = clientsData.filter(c => c.assignedTo === currentUserId);
      }
      
      const mappedClients = filteredClientsData.map(c => ({
        ...c,
        lastUpdate: c.updatedAt && typeof c.updatedAt === 'object' && 'seconds' in c.updatedAt ? 
          format(new Date((c.updatedAt as any).seconds * 1000), 'dd/MM/yyyy', { locale: ptBR }) : 
          (c.updatedAt ? format(new Date(c.updatedAt as any), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A')
      }));
      
      setClients(mappedClients);

      // 5. Criar log de auditoria
      await createClientAuditLog(
        "CREATE_CLIENT_ACCOUNT",
        `Conta de acesso criada para o cliente "${client.name}". Senha temporária: ${tempPassword}`,
        client.id
      );

      toast.success(`✅ Conta criada com sucesso! Senha temporária: ${tempPassword}`, {
        duration: 10000,
        description: "Envie esta senha ao cliente para o primeiro acesso."
      });

    } catch (error: any) {
      console.error("Erro ao criar conta do cliente:", error);
      toast.error(`Erro ao criar conta: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para confirmar exclusão
  const handleDeleteConfirm = (client: LocalClient) => {
    setClientToDelete(client);
    setDeleteConfirmOpen(true);
  };

  // Função para executar a exclusão após confirmação
  const executeDelete = () => {
    if (clientToDelete) {
      handleDeleteClient(clientToDelete.id);
      setClientToDelete(null);
    }
  };

  const handleViewClient = (client: LocalClient) => {
    navigate(`/client/${client.id}`);
  };

  const handleEditClient = (client: LocalClient) => {
    setClientToEdit(client);
    setEditConfirmOpen(true);
  };

  // Função para confirmar edição
  const confirmEdit = () => {
    if (clientToEdit) {
      setSelectedClient(clientToEdit);
      setEditClient({
        name: clientToEdit.name,
        project: clientToEdit.project,
        status: clientToEdit.status,
        contactName: clientToEdit.contactName || "",
        email: clientToEdit.email || "",
        phone: clientToEdit.phone || "",
        assignedTo: clientToEdit.assignedTo || "",
        assignedToName: clientToEdit.assignedToName || "",
        address: clientToEdit.address || "",
        cpf: clientToEdit.cpf || "",
        cnpj: clientToEdit.cnpj || "",
        documents: clientToEdit.documents || []
      });
      setIsEditDialogOpen(true);
      setClientToEdit(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedClient || !editClient.name || !editClient.project) {
      toast.error("Por favor, preencha o nome da empresa e o projeto!");
      return;
    }

    if (!editClient.phone) {
      toast.error("Por favor, preencha o telefone!");
      return;
    }

    if (!editClient.cpf && !editClient.cnpj) {
      toast.error("Por favor, preencha o CPF ou CNPJ!");
      return;
    }

    try {
      setIsLoading(true);
      
      // Detectar mudanças
      const changes: Record<string, { from: any; to: any }> = {};
      const originalClient = clients.find(c => c.id === selectedClient.id);
      
      if (originalClient) {
        if (originalClient.name !== editClient.name) {
          changes['Nome da Empresa'] = { from: originalClient.name, to: editClient.name };
        }
        if (originalClient.project !== editClient.project) {
          changes['Projeto'] = { from: originalClient.project, to: editClient.project };
        }
        if (originalClient.status !== editClient.status) {
          changes['Status'] = { from: originalClient.status, to: editClient.status };
        }
        if (originalClient.contactName !== editClient.contactName) {
          changes['Contato'] = { from: originalClient.contactName || 'N/A', to: editClient.contactName || 'N/A' };
        }
        // E-mail não pode ser alterado para evitar conflitos com contas de acesso
        if (originalClient.phone !== editClient.phone) {
          changes['Telefone'] = { from: originalClient.phone || 'N/A', to: editClient.phone || 'N/A' };
        }
        if (originalClient.cpf !== editClient.cpf) {
          changes['CPF'] = { from: originalClient.cpf || 'N/A', to: editClient.cpf || 'N/A' };
        }
        if (originalClient.cnpj !== editClient.cnpj) {
          changes['CNPJ'] = { from: originalClient.cnpj || 'N/A', to: editClient.cnpj || 'N/A' };
        }
        if (originalClient.assignedToName !== editClient.assignedToName) {
          changes['Responsável'] = { from: originalClient.assignedToName || 'Não atribuído', to: editClient.assignedToName || 'Não atribuído' };
        }
      }
      
      // Garantir que o email não seja alterado (usar o email original)
      await updateClient(selectedClient.id, {
        ...editClient,
        email: originalClient?.email || editClient.email, // Manter email original
        updatedAt: new Date() as any
      });
      
      // Sincronizar automaticamente com dados financeiros
      console.log("🔄 Sincronizando cliente com dados financeiros...");
      await syncSingleClientWithFinancialClient(selectedClient.id);
      
      // Criar log de auditoria
      const changeDetails = Object.keys(changes).length > 0 
        ? `Campos alterados: ${Object.keys(changes).join(', ')}`
        : 'Dados do cliente atualizados';

      await createClientAuditLog(
        "UPDATE_CLIENT",
        `Cliente "${editClient.name}" - ${changeDetails}`,
        selectedClient.id,
        changes
      );
      
      // Atualizar lista local
      setClients(prev => prev.map(client => 
        client.id === selectedClient.id 
          ? { 
              ...client, 
              ...editClient, 
              lastUpdate: format(new Date(), 'dd/MM/yyyy', { locale: ptBR })
            }
          : client
      ));
      
      setIsEditDialogOpen(false);
      setSelectedClient(null);
      toast.success("Cliente atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      toast.error("Erro ao atualizar cliente. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Função para abrir modal de documentos (simplificada para este exemplo)
  const handleViewDocuments = (client: LocalClient) => {
    setSelectedClient(client);
    setIsDocumentsDialogOpen(true);
  };

  // Função para baixar relatório do cliente
  const handleDownloadReport = (client: LocalClient) => {
    toast.loading("Gerando relatório...");
    
    setTimeout(() => {
      toast.dismiss();
      toast.success("Relatório gerado com sucesso!");
      
      const clientData = JSON.stringify(client, null, 2);
      const blob = new Blob([clientData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${(client.name || 'cliente').toLowerCase().replace(/\s+/g, '-')}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
    }, 1500);
  };

  // Função de teste para debugar Firebase
  const testFirebaseConnection = async () => {
    try {
      console.log("🧪 Testando conexão com Firebase...");
      toast.loading("Testando conexão com Firebase...");
      
      // Teste básico de conexão
      const testQuery = await getDocs(collection(db, "clients"));
      console.log("📊 Teste direto - documentos encontrados:", testQuery.size);
      
      testQuery.docs.forEach((doc, index) => {
        console.log(`📄 Documento ${index + 1}:`, doc.id, doc.data());
      });
      
      toast.dismiss();
      toast.success(`Conexão OK! ${testQuery.size} documentos encontrados`);
    } catch (error) {
      console.error("❌ Erro no teste:", error);
      toast.dismiss();
      toast.error("Erro na conexão: " + error.message);
    }
  };

  // Função para abrir histórico de cliente
  const handleViewClientHistory = (client: LocalClient) => {
    navigate(`/client/${client.id}/history`);
  };

  return (
    <div className="client-management flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold">Gerenciamento de Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasPermission(userRole as HierarchyLevel, 'manage_department')
              ? "Cadastre, visualize e gerencie todos os clientes da empresa com atribuição de responsáveis"
              : "Visualize e gerencie os clientes pelos quais você é responsável"
            }
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          {/* Botões para usuários com permissão de gestão */}
          {hasPermission(userRole as HierarchyLevel, 'manage_department') && (
            <>
              {/* Botão para criar contas - apenas para Diretor de TI */}
              {userRole === "Diretor de TI" && (
                <Button 
                  onClick={handleCreateAccountsForOldClients}
                  disabled={isLoading}
                  variant="outline"
                  size="icon"
                  className="border-cerrado-green2 text-cerrado-green2 hover:bg-cerrado-green2 hover:text-white"
                  title="Criar contas para clientes antigos"
                >
                  <UserCheck className="h-4 w-4" />
                </Button>
              )}
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-red-500 hover:bg-red-600 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Cliente</DialogTitle>
                      <DialogDescription>
                        Preencha os dados do novo cliente. Os campos marcados com * são obrigatórios. É necessário preencher CPF ou CNPJ. O e-mail é obrigatório para criação da conta de acesso.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome da Empresa *</Label>
                        <Input 
                          id="name" 
                          name="name" 
                          value={newClient.name}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="project">Projeto *</Label>
                        <Input 
                          id="project" 
                          name="project" 
                          value={newClient.project}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select 
                          onValueChange={handleSelectChange}
                          defaultValue={newClient.status}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Em andamento">Em andamento</SelectItem>
                            <SelectItem value="Concluído">Concluído</SelectItem>
                            <SelectItem value="Em análise">Em análise</SelectItem>
                            <SelectItem value="Aguardando documentos">Aguardando documentos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="contactName">Nome do Contato</Label>
                        <Input 
                          id="contactName" 
                          name="contactName" 
                          value={newClient.contactName || ""}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail *</Label>
                        <Input 
                          id="email" 
                          name="email" 
                          type="email" 
                          value={newClient.email || ""}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone *</Label>
                        <Input 
                          id="phone" 
                          value={newClient.phone || ""} 
                          onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                          placeholder="(11) 99999-9999" 
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="document">CPF ou CNPJ *</Label>
                        <Input 
                          id="document" 
                          name="document"
                          value={getDocumentValue(newClient.cpf, newClient.cnpj)}
                          onChange={(e) => handleDocumentChange(e.target.value)}
                          placeholder="Digite CPF ou CNPJ" 
                          maxLength={18}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="assignedTo">Responsável</Label>
                        <Select value={newClient.assignedTo} onValueChange={(value) => {
                          const selectedCollab = collaborators.find(c => c.id === value);
                          setNewClient({
                            ...newClient, 
                            assignedTo: value === "none" ? "" : value,
                            assignedToName: selectedCollab ? selectedCollab.name : ""
                          });
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum responsável</SelectItem>
                            {collaborators.map((collaborator) => (
                              <SelectItem key={collaborator.id} value={collaborator.id}>
                                {collaborator.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddClient}>
                        Adicionar Cliente
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

      {/* Filtros e busca */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex flex-col lg:flex-row gap-3 lg:justify-between lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              placeholder="Buscar cliente ou projeto..."
              className="pl-10 h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Seleção de limite de registros */}
          <div className="flex items-center gap-2">
            <Label htmlFor="items-per-page-clients" className="text-sm whitespace-nowrap">
              Registros por página:
            </Label>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger id="items-per-page-clients" className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabela com scroll */}
      <div className="flex-1 overflow-hidden flex flex-col border rounded-lg min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Carregando clientes...</p>
            </div>
          ) : filteredClients.length > 0 ? (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                <TableRow>
                  <TableHead className="w-[200px] text-center">Empresa</TableHead>
                  <TableHead className="w-[180px] text-center">Projeto</TableHead>
                  <TableHead className="w-[120px] text-center">Status</TableHead>
                  <TableHead className="w-[160px] text-center">Responsável</TableHead>
                  <TableHead className="w-[120px] text-center">Última Atualização</TableHead>
                  <TableHead className="w-[140px] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3 max-w-[180px]">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {(client.name || 'CL').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="truncate block max-w-[160px] mx-auto">{client.project}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`badge px-2 py-1 rounded-full text-xs font-medium
                          ${client.status === 'Em andamento' ? 'bg-blue-100 text-blue-800' : ''}
                          ${client.status === 'Concluído' ? 'bg-green-100 text-green-800' : ''}
                          ${client.status === 'Em análise' ? 'bg-purple-100 text-purple-800' : ''}
                          ${client.status === 'Aguardando documentos' ? 'bg-yellow-100 text-yellow-800' : ''}
                        `}>
                          {client.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2 max-w-[140px] mx-auto">
                          {client.assignedToName ? (
                            <>
                              <UserCheck className="h-3 w-3 text-green-600 flex-shrink-0" />
                              <span className="text-sm truncate">{client.assignedToName}</span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">Não atribuído</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm truncate block max-w-[100px] mx-auto">{client.lastUpdate}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewClient(client)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar detalhes
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              onClick={() => handleViewClientHistory(client)}
                            >
                              <History className="mr-2 h-4 w-4" />
                              Ver histórico
                            </DropdownMenuItem>

                            {hasPermission(userRole as HierarchyLevel, 'manage_department') && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleEditClient(client)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar cliente
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleDeleteConfirm(client)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Deletar cliente
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
          ) : (
            <div className="text-center py-10">
              <Building className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">
                {searchTerm ? "Nenhum cliente encontrado para essa busca." : (
                  hasPermission(userRole as HierarchyLevel, 'manage_department')
                    ? "Nenhum cliente encontrado." 
                    : "Nenhum cliente atribuído a você ainda."
                )}
              </p>
              {/* Botão para usuários com permissão de gestão */}
              {hasPermission(userRole as HierarchyLevel, 'manage_department') && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  {clients.length === 0 ? "Adicionar o primeiro cliente" : "Adicionar novo cliente"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Paginação */}
        {!isLoading && filteredClients.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/50 flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredClients.length)} de {filteredClients.length} clientes
              {searchTerm && ` (de ${clients.length} total)`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Edição de Cliente */}
      {selectedClient && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Atualize os dados do cliente. Os campos marcados com * são obrigatórios. É necessário preencher CPF ou CNPJ.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome da Empresa *</Label>
                <Input 
                  id="edit-name" 
                  value={editClient.name}
                  onChange={(e) => setEditClient(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-project">Projeto *</Label>
                <Input 
                  id="edit-project" 
                  value={editClient.project}
                  onChange={(e) => setEditClient(prev => ({ ...prev, project: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  onValueChange={(value) => setEditClient(prev => ({ ...prev, status: value as LocalClient["status"] }))}
                  defaultValue={editClient.status}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                    <SelectItem value="Em análise">Em análise</SelectItem>
                    <SelectItem value="Aguardando documentos">Aguardando documentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-assignedTo">Responsável</Label>
                <Select 
                  value={editClient.assignedTo || "none"} 
                  onValueChange={(value) => {
                    const selectedCollab = collaborators.find(c => c.id === value);
                    setEditClient(prev => ({ 
                      ...prev, 
                      assignedTo: value === "none" ? "" : value,
                      assignedToName: selectedCollab ? selectedCollab.name : ""
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum responsável</SelectItem>
                    {collaborators.map((collaborator) => (
                      <SelectItem key={collaborator.id} value={collaborator.id}>
                        {collaborator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contactName">Nome do Contato</Label>
                <Input 
                  id="edit-contactName" 
                  value={editClient.contactName}
                  onChange={(e) => setEditClient(prev => ({ ...prev, contactName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  value={editClient.email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  title="O e-mail não pode ser alterado para evitar conflitos com contas de acesso existentes"
                />
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone *</Label>
                <Input 
                  id="edit-phone" 
                  value={editClient.phone}
                  onChange={(e) => setEditClient(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-document">CPF ou CNPJ *</Label>
                <Input 
                  id="edit-document" 
                  value={getDocumentValue(editClient.cpf, editClient.cnpj)}
                  onChange={(e) => handleEditDocumentChange(e.target.value)}
                  placeholder="Digite CPF ou CNPJ"
                  maxLength={18}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Salvar alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Documentos (simplificado) */}
      {selectedClient && (
        <Dialog open={isDocumentsDialogOpen} onOpenChange={setIsDocumentsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Documentos do Cliente</DialogTitle>
              <DialogDescription>
                Documentos anexados para {selectedClient.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedClient.documents && selectedClient.documents.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedClient.documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>{doc.name}</TableCell>
                          <TableCell>{doc.type || 'Documento'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(doc.url, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">Nenhum documento encontrado.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDocumentsDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo de confirmação para exclusão */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir o cliente "${clientToDelete?.name}"? Esta ação não pode ser desfeita e todos os dados relacionados serão permanentemente removidos.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={executeDelete}
        variant="destructive"
      />

      {/* Diálogo de confirmação para edição */}
      <ConfirmationDialog
        open={editConfirmOpen}
        onOpenChange={setEditConfirmOpen}
        title="Confirmar Edição"
        description={`Deseja editar os dados do cliente "${clientToEdit?.name}"? Você poderá modificar todas as informações do cliente.`}
        confirmText="Editar"
        cancelText="Cancelar"
        onConfirm={confirmEdit}
        variant="default"
      />
    </div>
  );
};
