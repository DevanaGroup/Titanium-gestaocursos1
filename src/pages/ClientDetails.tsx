import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Bot, Calendar, Home, KanbanSquare, Trash2, User, Users, Folder as FolderIcon, Plus, ChevronRight, ChevronLeft, Upload, Eye, X, CheckCircle, AlertCircle, FileText, Image, File as FileIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { db, auth, storage } from '@/config/firebase';
import { doc, getDoc, collection, getDocs, query, where, orderBy, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { canViewClient, normalizeHierarchyLevel } from '@/utils/hierarchyUtils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import Logo from '@/components/Logo';
import CustomSidebar from '@/components/CustomSidebar';
import { Download, Trash } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createWorker } from 'tesseract.js';
import * as pdfjs from "pdfjs-dist";
import { GlobalWorkerOptions } from "pdfjs-dist";
import { useDropzone } from 'react-dropzone';
import { CircularProgress, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText } from '@mui/material'
import axios from 'axios';
import { 
  getFoldersByClient, 
  createCustomFolder,
  createSubfolder,
  getSubfoldersByParent,
  updateFolder, 
  deleteFolder,
  getDocumentsByFolder,
  getDocumentsByClient,
  createDocument,
  deleteDocument,
  moveDocument,
  createDefaultFoldersForExistingClients,
  createDefaultFolderStructure,
  hasAccessToFolder,
  filterFoldersByPermission,
  uploadFileToStorage,
  type Folder,
  type FolderDocument
} from '@/services/folderService';
import { useTabCloseLogout } from "@/hooks/useTabCloseLogout";
import { HierarchyLevel } from '@/types';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface Client {
  id: string;
  name: string;
  project: string;
  status: string;
  lastUpdate: string;
  contactName?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
}

interface UserData {
  name: string;
  role: string;
  avatar: string;
}

// Adicionar interface para o documento no Firestore
interface FirestoreDocument {
  id: string;
  clientId: string;
  name: string;
  storageUrl: string;
  uploadDate: string;
  categoriaId: string;
  categoriaNome: string;
  subCategoriaId: string;
  subCategoriaNome: string;
  observacao: string;
  content: string;
}

interface FolderStats {
  documentCount: number;
  totalSize: number;
}

// Interface para gerenciar uploads múltiplos
interface FileUpload {
  id: string;
  file: File;
  name: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  documentId?: string;
}

const ClientDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [userData, setUserData] = useState<UserData>({
    name: 'Usuário',
    role: 'Gerente',
    avatar: '/placeholder.svg'
  });
  const [activeTab, setActiveTab] = useState<"info" | "documents">("documents");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [subCategorias, setSubCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [subCategoriaSelecionada, setSubCategoriaSelecionada] = useState('');
  const [observacaoDocumento, setObservacaoDocumento] = useState('');
  const [convertedFiles, setConvertedFiles] = useState<File[]>([]);
  const [pastaSelecionada, setPastaSelecionada] = useState<string | null>(null);

  // Novos estados para pastas
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<FolderDocument[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Novo estado para controlar a navegação
  const [isInRootFolder, setIsInRootFolder] = useState(true);

  // Novos estados para sub-pastas
  const [subfolders, setSubfolders] = useState<Record<string, Folder[]>>({});
  const [currentParentFolder, setCurrentParentFolder] = useState<Folder | null>(null);
  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState("");

  // Estados para seleção de sub-pastas no modal
  const [availableSubfolders, setAvailableSubfolders] = useState<Folder[]>([]);
  const [selectedSubfolder, setSelectedSubfolder] = useState<string>("");
  const [selectedMainFolder, setSelectedMainFolder] = useState<Folder | null>(null);

  // Novo estado para armazenar o caminho da pasta
  const [folderPath, setFolderPath] = useState<Folder[]>([]);

  // Novo estado de loading para pastas
  const [isFoldersLoading, setIsFoldersLoading] = useState(true);

  // Novos estados para controle do modal de upload direto na pasta
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Estado para controle de acesso às pastas - INICIALIZAR SEM FILTRO ATÉ CARREGAR OS DADOS REAIS
  const [userHierarchyLevel, setUserHierarchyLevel] = useState<HierarchyLevel | null>(null);
  const [userHierarchyLevelRaw, setUserHierarchyLevelRaw] = useState<string | null>(null); // Valor original do banco

  // Estados para controle dos diálogos de confirmação
  const [deleteFolderConfirmOpen, setDeleteFolderConfirmOpen] = useState(false);
  const [deleteDocumentConfirmOpen, setDeleteDocumentConfirmOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{id: string; name: string} | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<{id: string; name: string} | null>(null);

  // Estado para armazenar estatísticas das pastas
  const [folderStats, setFolderStats] = useState<Record<string, FolderStats>>({});

  // Estados para upload múltiplo
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
  const [isMultiUploading, setIsMultiUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  // Ativa o logout automático quando a guia é fechada
  useTabCloseLogout();

  // Gerenciamento de estado do usuário logado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Buscar dados do usuário no Firestore
        const userDoc = await getDoc(doc(db, "collaborators_unified", user.uid));

        if (userDoc.exists()) {
          const data = userDoc.data();
          // Mostrar apenas o firstName
          const displayName = data.firstName || "Usuário";
          const hierarchyLevelRaw = data.hierarchyLevel || 'Nível 5';
          const hierarchyLevel = normalizeHierarchyLevel(hierarchyLevelRaw);

          setUserData({
            name: displayName,
            role: hierarchyLevel,
            avatar: data.avatar || data.photoURL || "/placeholder.svg"
          });
          
          // Definir o nível hierárquico para controle de acesso às pastas
          setUserHierarchyLevel(hierarchyLevel);
          setUserHierarchyLevelRaw(hierarchyLevelRaw); // Manter valor original para comparações específicas
        } else {
          // Se não encontrou na coleção unificada, definir dados padrão
          console.log("❌ ClientDetails - Usuário não encontrado na coleção unificada");
          setUserData({
            name: "Usuário",
            role: "Nível 5",
            avatar: "/placeholder.svg"
          });
          setUserHierarchyLevel("Nível 5");
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Função para gerar as iniciais a partir do nome
  const getAvatarInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Função para sair da conta
  const handleLogout = () => {
    auth.signOut().then(() => {
      toast.info("Você foi desconectado");
      navigate("/");
    }).catch((error) => {
      toast.error("Erro ao fazer logout: " + error.message);
    });
  };

  // Função para calcular estatísticas da pasta
  const calculateFolderStats = async (folderId: string): Promise<FolderStats> => {
    if (!client?.id || !folderId) {
      return {
        documentCount: 0,
        totalSize: 0
      };
    }

    try {
      const folderDocuments = await getDocumentsByFolder(client.id, folderId);
      const documentCount = folderDocuments.length;
      const totalSize = folderDocuments.reduce((acc, doc) => acc + (doc.size || 0), 0);

      return {
        documentCount,
        totalSize
      };
    } catch (error) {
      console.error("Erro ao calcular estatísticas da pasta:", error);
      return {
        documentCount: 0,
        totalSize: 0
      };
    }
  };

  // Função para buscar todas as pastas e subpastas
  const fetchFoldersAndSubfolders = async () => {
    if (!client?.id) return;
    
    console.log('Cliente carregado, buscando pastas para:', client.id);
    
    setIsFoldersLoading(true);
    
    try {
      // Buscar todas as pastas do cliente
      const allFolders = await getFoldersByClient(client.id);
      console.log('Total de pastas:', allFolders.length);
      
      // Aplicar filtro de permissões APENAS se o userHierarchyLevel já foi carregado
      let filteredFolders = allFolders;
      if (userHierarchyLevel !== null) {
        filteredFolders = filterFoldersByPermission(allFolders, userHierarchyLevel);
        console.log('Pastas após filtro de permissões:', filteredFolders.length);
      } else {
        console.log('⏳ Aguardando dados do usuário para aplicar filtro de permissões');
      }
      
      // Separar pastas raiz e subpastas
      const rootFolders = filteredFolders.filter(folder => !folder.parentId);
      console.log('Total de pastas raiz após filtro:', rootFolders.length);
      
      const subFoldersByParent: Record<string, Folder[]> = {};
      
      // Agrupar subpastas por pasta pai
      filteredFolders
        .filter(folder => folder.parentId)
        .forEach(subFolder => {
          if (subFolder.parentId) {
            if (!subFoldersByParent[subFolder.parentId]) {
              subFoldersByParent[subFolder.parentId] = [];
            }
            subFoldersByParent[subFolder.parentId].push(subFolder);
          }
        });
      
      // Ordenar pastas por ordem
      rootFolders.sort((a, b) => a.ordem - b.ordem);
      Object.values(subFoldersByParent).forEach(subFolders => {
        subFolders.sort((a, b) => a.ordem - b.ordem);
      });
      
      setFolders(rootFolders);
      setSubfolders(subFoldersByParent);
      setActiveTab("documents");
      
      // Calcular estatísticas para cada pasta (apenas para as pastas filtradas)
      const stats: Record<string, FolderStats> = {};
      for (const folder of filteredFolders) {
        if (folder.id) {
          stats[folder.id] = await calculateFolderStats(folder.id);
        }
      }
      setFolderStats(stats);
    } catch (error) {
      console.error("Erro ao buscar pastas:", error);
      toast.error("Erro ao carregar as pastas");
    } finally {
      setIsFoldersLoading(false);
    }
  };

  // Atualizar useEffect para usar a nova função
  useEffect(() => {
    const loadClient = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        
        // Verificar se o usuário é Cliente Externo e tem acesso a este cliente
        const currentUser = auth.currentUser;
        if (currentUser && userHierarchyLevelRaw === "Cliente Externo") {
          // Buscar dados do colaborador para obter o clientId vinculado
          const collaboratorDoc = await getDoc(doc(db, "collaborators_unified", currentUser.uid));
          if (collaboratorDoc.exists()) {
            const collaboratorData = collaboratorDoc.data();
            // Buscar o cliente vinculado a este colaborador
            const clientsSnapshot = await getDocs(query(collection(db, "clients"), where("collaboratorId", "==", currentUser.uid)));
            if (clientsSnapshot.empty || clientsSnapshot.docs[0].id !== id) {
              toast.error("Você não tem permissão para acessar este cliente");
              navigate('/dashboard', { state: { activeTab: "tasks" } });
              return;
            }
          }
        }
        
        const clientDoc = await getDoc(doc(db, "clients", id));
        
        if (clientDoc.exists()) {
          const clientData = {
            id: clientDoc.id,
            ...clientDoc.data()
          } as Client;
          
          setClient(clientData);
        } else {
          toast.error("Cliente não encontrado");
          navigate('/dashboard', { state: { activeTab: "clients" } });
        }
      } catch (error) {
        console.error("Erro ao carregar cliente:", error);
        toast.error("Erro ao carregar dados do cliente");
      } finally {
        setIsLoading(false);
      }
    };

    // Aguardar userHierarchyLevel ser carregado antes de verificar acesso
    if (userHierarchyLevel !== null) {
      loadClient();
    }
  }, [id, navigate, userHierarchyLevel]);

  // useEffect separado para carregar pastas quando o cliente estiver pronto
  useEffect(() => {
    if (client?.id) {
      console.log('Cliente carregado, buscando pastas para:', client.id);
      
      // Aplicar estrutura completa automaticamente se necessário
      const ensureComplete7FolderStructure = async () => {
        try {
          // Buscar pastas existentes
          const existingFolders = await getFoldersByClient(client.id);
          const mainFolders = existingFolders.filter(f => !f.parentId);
          
          // Se não tem 7 pastas principais, aplicar estrutura completa apenas para este cliente
          if (mainFolders.length < 7) {
            console.log(`🔧 Cliente tem apenas ${mainFolders.length} pastas. Aplicando estrutura completa para este cliente...`);
            // Usar a função que cria a estrutura padrão para o cliente específico
            await createDefaultFolderStructure(client.id);
          }
          
          // Carregar as pastas (agora completas)
          await fetchFoldersAndSubfolders();
        } catch (error) {
          console.error('Erro ao aplicar estrutura completa:', error);
          // Mesmo com erro, tentar carregar as pastas existentes
          await fetchFoldersAndSubfolders();
        }
      };
      
      ensureComplete7FolderStructure();
    }
  }, [client]);

  // Função para criar nova pasta personalizada
  const handleCreateCustomFolder = async () => {
    if (!client || !newFolderName.trim()) {
      toast.error("Nome da pasta é obrigatório");
      return;
    }

    try {
      const newFolder = await createCustomFolder(client.id, {
        nome: newFolderName.trim(),
        icone: 'folder',
        isPadrao: false,
        ordem: folders.length + 1,
        path: newFolderName.trim().toLowerCase().replace(/\s+/g, '-'),
        allowedFileTypes: []
      });

      setFolders(prev => [...prev, newFolder]);
      setNewFolderName("");
      setIsCreatingFolder(false);
      toast.success("Pasta criada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar pasta:", error);
      toast.error("Erro ao criar pasta");
    }
  };

  // Função para deletar pasta
  const handleDeleteFolder = async (folderId: string) => {
    // Verificar se o usuário é gerente
    if (userData.role !== "Gerente") {
      toast.error("Apenas gerentes podem excluir pastas");
      return;
    }

    // Encontrar a pasta
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      toast.error("Pasta não encontrada");
      return;
    }

    // Verificar se é uma pasta padrão
    if (folder.isPadrao) {
      toast.error("Não é possível excluir pastas padrão");
      return;
    }

    try {
      await deleteFolder(client.id, folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      
      // Atualizar as estatísticas removendo a pasta excluída
      setFolderStats(prev => {
        const newStats = { ...prev };
        delete newStats[folderId];
        return newStats;
      });

      toast.success("Pasta excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir pasta:", error);
      if (error instanceof Error) {
        toast.error(error.message || "Erro ao excluir pasta");
      } else {
        toast.error("Erro ao excluir pasta");
      }
    }
  };

  // Função para voltar para a lista de pastas
  const handleBackToFolders = () => {
    setSelectedFolder(null);
    setIsInRootFolder(true);
  };

  // Função para selecionar pasta
  const handleSelectFolder = async (folder: Folder) => {
    console.log('📂 handleSelectFolder chamado para:', folder.nome);
    console.log('folder.isSubfolder:', folder.isSubfolder);
    console.log('folder.parentId:', folder.parentId);
    
    // Verificar se o usuário tem acesso à pasta (apenas se o level já foi carregado)
    if (userHierarchyLevel !== null && !hasAccessToFolder(folder, userHierarchyLevel)) {
      toast.error("Você não tem permissão para acessar esta pasta");
      return;
    }
    
    setSelectedFolder(folder);
    setIsInRootFolder(false);
    setCurrentParentFolder(folder);
    
    console.log('🔄 Estados atualizados:');
    console.log('selectedFolder:', folder.nome);
    console.log('isInRootFolder:', false);
    console.log('currentParentFolder:', folder.nome);
    
    try {
      // Carregar documentos da pasta
      if (client?.id && folder.id) {
        const folderDocuments = await getDocumentsByFolder(client.id, folder.id);
        setDocuments(folderDocuments);
        console.log('📄 Documentos carregados:', folderDocuments.length);
      }

      // Atualizar o caminho da pasta
      if (folder.isSubfolder && folder.parentId) {
        const parentFolder = findFolderById(folder.parentId);
        if (parentFolder) {
          setFolderPath([parentFolder, folder]);
          console.log('🛤️  Caminho da pasta (sub-pasta):', [parentFolder.nome, folder.nome]);
        }
      } else {
        setFolderPath([folder]);
        console.log('🛤️  Caminho da pasta (pasta principal):', [folder.nome]);
      }
    } catch (error) {
      console.error("Erro ao carregar pasta:", error);
      toast.error("Erro ao carregar pasta");
    }
  };

  // Função para encontrar uma pasta por ID em todos os níveis
  const findFolderById = (folderId: string): Folder | undefined => {
    // Primeiro procurar nas pastas raiz
    const rootFolder = folders.find(f => f.id === folderId);
    if (rootFolder) return rootFolder;
    
    // Se não encontrar, procurar nas sub-pastas
    for (const parentId in subfolders) {
      const subfolder = subfolders[parentId].find(f => f.id === folderId);
      if (subfolder) return subfolder;
    }
    
    return undefined;
  };

  // Função para voltar para a pasta pai
  const handleBackToParent = async () => {
    console.log('🔙 handleBackToParent chamado');
    console.log('currentParentFolder:', currentParentFolder);
    console.log('currentParentFolder?.parentId:', currentParentFolder?.parentId);
    console.log('isInRootFolder:', isInRootFolder);
    console.log('folderPath:', folderPath);
    console.log('folders disponíveis (raiz):', folders.map(f => ({ id: f.id, nome: f.nome })));
    console.log('subfolders disponíveis:', Object.values(subfolders).flat().map(f => ({ id: f.id, nome: f.nome, parentId: f.parentId })));
    
    if (currentParentFolder?.parentId) {
      // Se estiver em uma sub-pasta, voltar para a pasta pai
      console.log('📁 Tentando voltar para pasta pai com ID:', currentParentFolder.parentId);
      const parentFolder = findFolderById(currentParentFolder.parentId);
      console.log('📂 Pasta pai encontrada:', parentFolder);
      if (parentFolder) {
        console.log('✅ Chamando handleSelectFolder para:', parentFolder.nome);
        await handleSelectFolder(parentFolder);
      } else {
        console.log('❌ Pasta pai não encontrada em nenhuma lista');
      }
    } else {
      // Se estiver em uma pasta principal, voltar para a lista de pastas
      console.log('🏠 Voltando para lista de pastas (pasta principal)');
      setSelectedFolder(null);
      setCurrentParentFolder(null);
      setIsInRootFolder(true);
      setFolderPath([]);
      setDocuments([]);
    }
  };

  // Função para baixar documento
  const handleDownloadDocument = (url: string) => {
    window.open(url, '_blank');
  };

  // Função para deletar documento
  const handleDeleteDocument = async (documentId: string) => {
    try {
      // Buscar dados do documento antes de deletar para auditoria
      const documentToDelete = documents.find(doc => doc.id === documentId);
      
      await deleteDocument(client.id, documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // Criar log de auditoria
      if (documentToDelete && client) {
        await createDocumentAuditLog(
          "DELETE_DOCUMENT",
          `Documento "${documentToDelete.name}" foi excluído da pasta "${documentToDelete.folderName || 'Pasta'}"`,
          client.id,
          {
            'Documento': { from: documentToDelete.name, to: '' },
            'Pasta': { from: documentToDelete.folderName || 'Pasta', to: '' }
          }
        );
      }
      
      toast.success("Documento excluído com sucesso");
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      toast.error("Erro ao excluir documento");
    }
  };

  // Função para selecionar arquivo para upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Criar uploads para cada arquivo
      const newUploads: FileUpload[] = files.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        name: file.name.split('.')[0], // Nome sem extensão
        progress: 0,
        status: 'pending'
      }));
      
      setFileUploads(prev => [...prev, ...newUploads]);
      
      // Manter compatibilidade com o sistema atual
      if (files.length === 1) {
        setSelectedFile(files[0]);
        if (!documentName) {
          setDocumentName(files[0].name.split('.')[0]);
        }
      }
    }
  };

  // Função para processar uploads múltiplos
  const handleMultiUpload = async () => {
    if (fileUploads.length === 0 || !client || !selectedFolder) {
      toast.error("Selecione arquivos e uma pasta de destino");
      return;
    }

    // Verificar se o usuário tem acesso à pasta atual
    if (userHierarchyLevel !== null && !hasAccessToFolder(selectedFolder, userHierarchyLevel)) {
      toast.error("Você não tem permissão para fazer upload nesta pasta");
      return;
    }

    setIsMultiUploading(true);
    const targetFolderId = selectedFolder.id;
    const targetFolder = selectedFolder;

    try {
      // Processar uploads em paralelo
      const uploadPromises = fileUploads.map(async (fileUpload) => {
        try {
          // Atualizar status para uploading
          setFileUploads(prev => prev.map(upload => 
            upload.id === fileUpload.id 
              ? { ...upload, status: 'uploading', progress: 0 }
              : upload
          ));
          
          console.log(`🔄 Iniciando upload de: ${fileUpload.name}`);

          // Simular progresso mais realista
          const progressInterval = setInterval(() => {
            setFileUploads(prev => prev.map(upload => {
              if (upload.id === fileUpload.id) {
                const newProgress = Math.min(upload.progress + Math.random() * 15 + 5, 85);
                console.log(`📊 Progresso ${fileUpload.name}: ${Math.round(newProgress)}%`);
                return { ...upload, progress: newProgress };
              }
              return upload;
            }));
          }, 300);

          // Aguardar um pouco para mostrar a barra de progresso
          await new Promise(resolve => setTimeout(resolve, 500));

          // Upload real para o Firebase Storage
          const documentUrl = await uploadFileToStorage(fileUpload.file, client.id, targetFolderId);

          clearInterval(progressInterval);

          // Criar documento na nova estrutura
          const newDocument = await createDocument(client.id, {
            name: fileUpload.name,
            url: documentUrl,
            uploadDate: new Date().toLocaleDateString('pt-BR'),
            clientId: client.id,
            folderId: targetFolderId,
            folderName: targetFolder.nome,
            categoriaId: categoriaSelecionada,
            categoriaNome: categorias.find(c => c.id === categoriaSelecionada)?.nome || '',
            subCategoriaId: subCategoriaSelecionada,
            subCategoriaNome: subCategorias.find(sc => sc.id === subCategoriaSelecionada)?.nome || '',
            observacao: observacaoDocumento,
            content: "",
            createdAt: new Date(),
            updatedAt: new Date()
          });

          // Atualizar status para completed
          setFileUploads(prev => prev.map(upload => 
            upload.id === fileUpload.id 
              ? { ...upload, status: 'completed', progress: 100, documentId: newDocument.id }
              : upload
          ));

          // Atualizar estado local dos documentos
          setDocuments(prev => [newDocument, ...prev]);

          // Criar log de auditoria
          await createDocumentAuditLog(
            "UPLOAD_DOCUMENT",
            `Documento "${fileUpload.name}" foi enviado para a pasta "${targetFolder.nome}"`,
            client.id,
            {
              'Documento': { from: '', to: fileUpload.name },
              'Pasta': { from: '', to: targetFolder.nome }
            }
          );

          return { success: true, document: newDocument };
        } catch (error) {
          console.error(`Erro ao fazer upload de ${fileUpload.name}:`, error);
          
          // Atualizar status para error
          setFileUploads(prev => prev.map(upload => 
            upload.id === fileUpload.id 
              ? { ...upload, status: 'error', error: 'Erro no upload' }
              : upload
          ));

          return { success: false, error };
        }
      });

      // Aguardar todos os uploads
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result.success).length;
      const failedUploads = results.filter(result => !result.success).length;

      // Recalcular estatísticas da pasta
      const newStats = await calculateFolderStats(targetFolderId);
      setFolderStats(prev => ({
        ...prev,
        [targetFolderId]: newStats
      }));

      // Mostrar resultado
      if (successfulUploads > 0) {
        toast.success(`${successfulUploads} documento(s) enviado(s) com sucesso!`);
      }
      if (failedUploads > 0) {
        toast.error(`${failedUploads} documento(s) falharam no upload`);
      }

      // Se todos os uploads foram bem-sucedidos, limpar a lista após um delay
      if (failedUploads === 0 && successfulUploads > 0) {
        setTimeout(() => {
          setFileUploads([]);
          setIsUploadModalOpen(false);
        }, 2000);
      }

    } catch (error) {
      console.error("Erro geral no upload múltiplo:", error);
      toast.error("Erro ao processar uploads");
    } finally {
      setIsMultiUploading(false);
    }
  };

  // Função para remover arquivo da lista de uploads
  const removeFileUpload = (uploadId: string) => {
    setFileUploads(prev => prev.filter(upload => upload.id !== uploadId));
  };

  // Função para limpar todos os uploads
  const clearAllUploads = () => {
    setFileUploads([]);
    setSelectedFile(null);
    setDocumentName("");
  };

  // Função para buscar sub-pastas quando uma pasta principal é selecionada no modal
  const handleFolderChangeInModal = async (folderId: string) => {
    setPastaSelecionada(folderId);
    setSelectedSubfolder(""); // Reset sub-pasta selecionada
    
    // Encontrar a pasta selecionada
    const folder = folders.find(f => f.id === folderId);
    setSelectedFolder(folder || null);
    setSelectedMainFolder(folder || null);
    
    if (client?.id && folderId) {
      try {
        // Buscar sub-pastas da pasta selecionada
        const clientSubfolders = await getSubfoldersByParent(client.id, folderId);
        setAvailableSubfolders(clientSubfolders);
      } catch (error) {
        console.error("Erro ao carregar sub-pastas:", error);
        setAvailableSubfolders([]);
      }
    } else {
      setAvailableSubfolders([]);
    }
  };

  const processOCR = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("https://cerrado-server.vercel.app/api/ocr", formData, {
        headers: {
          'Content-Type': 'multipart/form-data' // Importante: Defina o cabeçalho correto
        }
      });

      return response.data.text;
    } catch (error) {
      console.error("Erro ao processar OCR", error);
      return "Error";
    }
  };

  // Função para anexar documento ao cliente
  const handleAttachDocument = async () => {
    if (!selectedFile || !documentName || !client || !pastaSelecionada) {
      toast.error("Selecione um arquivo, preencha o nome e escolha uma pasta");
      return;
    }

    try {
      setIsUploading(true);
      toast.loading("Fazendo upload do documento...");

      // Determinar qual pasta usar (sub-pasta se selecionada, senão pasta principal)
      const targetFolderId = selectedSubfolder || pastaSelecionada;
      let targetFolder: Folder | undefined;
      
      if (selectedSubfolder) {
        // Se uma sub-pasta foi selecionada, buscar ela na lista de sub-pastas disponíveis
        targetFolder = availableSubfolders.find(f => f.id === selectedSubfolder);
      } else {
        // Senão, usar a pasta principal
        targetFolder = folders.find(f => f.id === pastaSelecionada);
      }
      
      if (!targetFolder) {
        toast.error("Pasta não encontrada");
        return;
      }

      // Verificar se o usuário tem acesso à pasta de destino (apenas se o level já foi carregado)
      if (userHierarchyLevel !== null && !hasAccessToFolder(targetFolder, userHierarchyLevel)) {
        toast.error("Você não tem permissão para fazer upload nesta pasta");
        return;
      }

      // Upload real para o Firebase Storage
      const documentUrl = await uploadFileToStorage(selectedFile, client.id, targetFolderId);

      // Criar documento na nova estrutura
      const newDocument = await createDocument(client.id, {
        name: documentName,
        url: documentUrl,
        uploadDate: new Date().toLocaleDateString('pt-BR'),
        clientId: client.id,
        folderId: targetFolderId,
        folderName: targetFolder.nome,
        categoriaId: categoriaSelecionada,
        categoriaNome: categorias.find(c => c.id === categoriaSelecionada)?.nome || '',
        subCategoriaId: subCategoriaSelecionada,
        subCategoriaNome: subCategorias.find(sc => sc.id === subCategoriaSelecionada)?.nome || '',
        observacao: observacaoDocumento,
        content: "", // Aqui seria o conteúdo do OCR se necessário
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Atualizar estado local
      setDocuments(prev => [newDocument, ...prev]);

      // Criar log de auditoria
      await createDocumentAuditLog(
        "UPLOAD_DOCUMENT",
        `Documento "${documentName}" foi anexado na pasta "${targetFolder.nome}"`,
        client.id,
        {
          'Documento': { from: '', to: documentName },
          'Pasta': { from: '', to: targetFolder.nome }
        }
      );

      // Recalcular estatísticas da pasta
      const newStats = await calculateFolderStats(targetFolderId);
      setFolderStats(prev => ({
        ...prev,
        [targetFolderId]: newStats
      }));

      // Limpar formulário
      setSelectedFile(null);
      setDocumentName("");
      setCategoriaSelecionada('');
      setSubCategoriaSelecionada('');
      setObservacaoDocumento('');
      setPastaSelecionada(null);
      setSelectedSubfolder("");
      setAvailableSubfolders([]);
      setSelectedMainFolder(null);

      toast.dismiss();
      toast.success("Documento anexado com sucesso!");
    } catch (error) {
      console.error("Erro ao anexar documento:", error);
      toast.dismiss();
      toast.error("Erro ao anexar documento");
    } finally {
      setIsUploading(false);
    }
  };

  // Função para fazer upload direto na pasta atual
  const handleUploadToCurrentFolder = async () => {
    if (!selectedFile || !documentName || !client || !selectedFolder) {
      toast.error("Selecione um arquivo e preencha o nome do documento");
      return;
    }

    // Verificar se o usuário tem acesso à pasta atual (apenas se o level já foi carregado)
    if (userHierarchyLevel !== null && !hasAccessToFolder(selectedFolder, userHierarchyLevel)) {
      toast.error("Você não tem permissão para fazer upload nesta pasta");
      return;
    }

    try {
      setIsUploading(true);
      toast.loading("Fazendo upload do documento...");

      // Usar a pasta atualmente selecionada (a que está sendo visualizada)
      const targetFolderId = selectedFolder.id;
      const targetFolder = selectedFolder;

      // Upload real para o Firebase Storage
      const documentUrl = await uploadFileToStorage(selectedFile, client.id, targetFolderId);

      // Criar documento na nova estrutura
      const newDocument = await createDocument(client.id, {
        name: documentName,
        url: documentUrl,
        uploadDate: new Date().toLocaleDateString('pt-BR'),
        clientId: client.id,
        folderId: targetFolderId,
        folderName: targetFolder.nome,
        categoriaId: categoriaSelecionada,
        categoriaNome: categorias.find(c => c.id === categoriaSelecionada)?.nome || '',
        subCategoriaId: subCategoriaSelecionada,
        subCategoriaNome: subCategorias.find(sc => sc.id === subCategoriaSelecionada)?.nome || '',
        observacao: observacaoDocumento,
        content: "", // Aqui seria o conteúdo do OCR se necessário
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Atualizar estado local dos documentos
      setDocuments(prev => [newDocument, ...prev]);

      // Criar log de auditoria
      await createDocumentAuditLog(
        "UPLOAD_DOCUMENT",
        `Documento "${documentName}" foi enviado para a pasta "${targetFolder.nome}"`,
        client.id,
        {
          'Documento': { from: '', to: documentName },
          'Pasta': { from: '', to: targetFolder.nome }
        }
      );

      // Recalcular estatísticas da pasta
      const newStats = await calculateFolderStats(targetFolderId);
      setFolderStats(prev => ({
        ...prev,
        [targetFolderId]: newStats
      }));

      // Fechar modal e limpar formulário
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setDocumentName("");
      setCategoriaSelecionada('');
      setSubCategoriaSelecionada('');
      setObservacaoDocumento('');

      toast.dismiss();
      toast.success("Documento enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar documento:", error);
      toast.dismiss();
      toast.error("Erro ao enviar documento");
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    
    // Define o primeiro arquivo como selectedFile se não houver um já definido
    if (acceptedFiles.length > 0 && !selectedFile) {
      setSelectedFile(acceptedFiles[0]);
    }

    // Processar apenas arquivos PDF
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    
    for (const file of pdfFiles) {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          
          // Verificar se o arrayBuffer tem conteúdo válido
          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            console.warn(`Arquivo ${file.name} está vazio ou corrompido`);
            return;
          }
          
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          const newFiles: File[] = [];

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const scale = 2;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            if (!context) continue;

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const renderContext = {
              canvas: canvas,
              canvasContext: context,
              viewport,
            };

            await page.render(renderContext).promise;

            // Convert canvas to Blob
            const blob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob(resolve, "image/png");
            });

            if (blob) {
              // Create a File from the Blob
              const newFile = new (window as any).File([blob], `${file.name}_page_${i}.png`, { type: "image/png" });
              newFiles.push(newFile);
            }
          }

          setConvertedFiles(prev => [...prev, ...newFiles]);
        } catch (error) {
          console.error(`Erro ao processar PDF ${file.name}:`, error);
          // Não exibir toast para não interromper o fluxo, apenas log no console
          // Se for necessário, o arquivo será usado como está
        }
      };
    }
  }, [selectedFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'application/pdf': []
    }
  });

  const handleDeleteFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
  };


  useEffect(() => {
    // Carregar categorias do Firestore
    const fetchCategorias = async () => {
      const categoriasSnapshot = await getDocs(collection(db, 'Categorias'));
      setCategorias(categoriasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchCategorias();
  }, []);

  useEffect(() => {
    // Carregar sub-categorias quando uma categoria é selecionada
    if (categoriaSelecionada) {
      const fetchSubCategorias = async () => {
        const subCategoriasSnapshot = await getDocs(query(collection(db, 'SubCategorias'), where('categoriaId', '==', categoriaSelecionada)));
        setSubCategorias(subCategoriasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };

      fetchSubCategorias();
    }
  }, [categoriaSelecionada]);

  const renderFolderContent = () => {
    if (isFoldersLoading) {
      return (
        <div className="col-span-6 text-center py-8">
          <p className="text-gray-500">Carregando pastas...</p>
        </div>
      );
    }
    
    if (isInRootFolder) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {folders && folders.length > 0 ? (
            <>
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => handleSelectFolder(folder)}
                  className="p-4 rounded-lg border cursor-pointer transition-all bg-card hover:bg-accent hover:text-accent-foreground hover:shadow-md relative group"
                >
                  {!folder.isPadrao && userData.role === "Gerente" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolderConfirm(folder.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <FolderIcon className="h-8 w-8" />
                    <span className="text-sm font-medium text-center">{folder.nome}</span>
                    {folder.description && (
                      <span className="text-xs text-muted-foreground text-center">{folder.description}</span>
                    )}
                    <div className="flex flex-col items-center text-xs text-muted-foreground">
                      <span>{folderStats[folder.id]?.documentCount || 0} documentos</span>
                      {subfolders[folder.id]?.length > 0 && (
                        <span>{subfolders[folder.id].length} sub-pastas</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Botão para criar nova pasta */}
              <div
                onClick={() => setIsCreatingFolder(true)}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors flex items-center justify-center hover:shadow-sm"
              >
                <div className="text-center">
                  <Plus className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <span className="text-sm text-gray-500">Nova Pasta</span>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-6 text-center py-8">
              <p className="text-gray-500">Nenhuma pasta encontrada. Clique em "Criar estrutura de pastas" para começar.</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Subpastas */}
        {currentParentFolder && subfolders[currentParentFolder.id]?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {subfolders[currentParentFolder.id].map((subfolder) => (
              <div
                key={subfolder.id}
                onClick={() => handleSelectFolder(subfolder)}
                className="p-4 rounded-lg border cursor-pointer transition-all bg-card hover:bg-accent hover:text-accent-foreground hover:shadow-md relative group"
              >
                {userData.role === "Gerente" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolderConfirm(subfolder.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
                <div className="flex flex-col items-center gap-2">
                  <FolderIcon className="h-8 w-8" />
                  <span className="text-sm font-medium text-center">{subfolder.nome}</span>
                  {subfolder.description && (
                    <span className="text-xs text-muted-foreground text-center">{subfolder.description}</span>
                  )}
                  <div className="flex flex-col items-center text-xs text-muted-foreground">
                    <span>{folderStats[subfolder.id]?.documentCount || 0} documentos</span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Botão para criar nova sub-pasta */}
            <div
              onClick={() => setIsCreatingSubfolder(true)}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors flex items-center justify-center hover:shadow-sm"
            >
              <div className="text-center">
                <Plus className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <span className="text-sm text-gray-500">Nova Sub-pasta</span>
              </div>
            </div>
          </div>
        )}

        {/* Se estamos em uma pasta mas não há sub-pastas, ainda mostrar o botão de criar sub-pasta */}
        {currentParentFolder && !currentParentFolder.parentId && (!subfolders[currentParentFolder.id] || subfolders[currentParentFolder.id].length === 0) && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div
              onClick={() => setIsCreatingSubfolder(true)}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors flex items-center justify-center hover:shadow-sm"
            >
              <div className="text-center">
                <Plus className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <span className="text-sm text-gray-500">Nova Sub-pasta</span>
              </div>
            </div>
          </div>
        )}

        {/* Documentos */}
        <div className="space-y-4">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum documento encontrado nesta pasta
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-card rounded-lg shadow border border-border hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  <FileText className="w-6 h-6 text-gray-400" />
                  <div>
                    <h4 className="font-medium">{doc.name}</h4>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Upload: {doc.uploadDate}</p>
                      <p className="text-sm text-gray-500">Adicionado por: {userData.name}</p>
                      <p className="text-sm text-gray-500">Categoria: {doc.categoriaNome}</p>
                      <p className="text-sm text-gray-500">Sub-categoria: {doc.subCategoriaNome}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadDocument(doc.url)}
                  >
                    <Download className="w-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDocumentConfirm(doc.id)}
                  >
                    <Trash2 className="w-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Função auxiliar para formatar o tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Função para criar sub-pasta
  const handleCreateSubfolder = async () => {
    if (!client || !newSubfolderName.trim() || !currentParentFolder) {
      toast.error("Nome da sub-pasta é obrigatório");
      return;
    }

    try {
      const newSubfolder = await createSubfolder(client.id, currentParentFolder.id, {
        nome: newSubfolderName.trim(),
        icone: 'folder',
        isPadrao: false,
        ordem: (subfolders[currentParentFolder.id]?.length || 0) + 1,
        path: `${currentParentFolder.path}/${newSubfolderName.trim().toLowerCase().replace(/\s+/g, '-')}`,
        allowedFileTypes: []
      });

      setSubfolders(prev => ({
        ...prev,
        [currentParentFolder.id]: [...(prev[currentParentFolder.id] || []), newSubfolder]
      }));

      setNewSubfolderName("");
      setIsCreatingSubfolder(false);
      toast.success("Sub-pasta criada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar sub-pasta:", error);
      toast.error("Erro ao criar sub-pasta");
    }
  };

  // Função para criar log de auditoria para documentos
  const createDocumentAuditLog = async (action: string, details: string, clientId: string, documentData?: any) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Buscar nome do usuário atual
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
        changes: documentData || {}
      };

      await addDoc(collection(db, 'auditLogs'), auditLog);
      console.log('📝 Log de auditoria criado:', auditLog);
    } catch (error) {
      console.error('Erro ao criar log de auditoria para documento:', error);
    }
  };

  // Funções de confirmação
  const handleDeleteFolderConfirm = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setFolderToDelete({id: folderId, name: folder.nome});
      setDeleteFolderConfirmOpen(true);
    }
  };

  const handleDeleteDocumentConfirm = (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (document) {
      setDocumentToDelete({id: documentId, name: document.name});
      setDeleteDocumentConfirmOpen(true);
    }
  };

  // Funções de execução após confirmação
  const executeDeleteFolder = () => {
    if (folderToDelete) {
      handleDeleteFolder(folderToDelete.id);
      setFolderToDelete(null);
    }
  };

  const executeDeleteDocument = () => {
    if (documentToDelete) {
      handleDeleteDocument(documentToDelete.id);
      setDocumentToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen bg-background">
          <CustomSidebar activeTab="clients" onTabChange={(tab) => {
            if (tab === "documents") {
              navigate("/documents");
              return;
            }
            if (tab === "chatbot") {
              navigate("/dashboard", { state: { activeTab: "chatbot" } });
              return;
            }
            navigate('/dashboard', { state: { activeTab: "clients" } });
          }} />
          <div className="flex flex-col flex-1">
            <header className="sticky top-0 z-20 flex items-center justify-between h-[80px] border-b bg-cerrado-green1 text-white px-4">
              <div className="flex items-center gap-4">
                <div className="text-xl font-semibold">Carregando informações do cliente</div>
              </div>
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-4 cursor-pointer">
                      <div className="flex flex-col items-end mr-2">
                        <span className="font-medium">{userData.name}</span>
                        <span className="text-xs opacity-80">{userData.role}</span>
                      </div>
                      <Avatar>
                        <AvatarImage src={userData.avatar} alt={userData.name} />
                        <AvatarFallback>{getAvatarInitials(userData.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard', { state: { activeTab: "clients" } })}>
                      <span>Voltar ao Dashboard</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            <main className="flex-1 dashboard-content bg-background p-6 overflow-auto h-[calc(100vh-80px)]">
              <div className="flex items-center justify-center h-full">
                <Card className="w-[600px]">
                  <CardHeader>
                    <CardTitle>Carregando informações do cliente</CardTitle>
                    <CardDescription>Aguarde enquanto os dados são carregados...</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!client) {
    return (
      <SidebarProvider>
        <div className="flex h-screen bg-background">
          <CustomSidebar activeTab="clients" onTabChange={(tab) => {
            if (tab === "documents") {
              navigate("/documents");
              return;
            }
            if (tab === "chatbot") {
              navigate("/dashboard", { state: { activeTab: "chatbot" } });
              return;
            }
            navigate('/dashboard', { state: { activeTab: "clients" } });
          }} />
          <div className="flex flex-col flex-1">
            <header className="sticky top-0 z-20 flex items-center justify-between h-[80px] border-b bg-cerrado-green1 text-white px-4">
              <div className="flex items-center gap-4">
                <div className="text-xl font-semibold">Cliente não encontrado</div>
              </div>
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-4 cursor-pointer">
                      <div className="flex flex-col items-end mr-2">
                        <span className="font-medium">{userData.name}</span>
                        <span className="text-xs opacity-80">{userData.role}</span>
                      </div>
                      <Avatar>
                        <AvatarImage src={userData.avatar} alt={userData.name} />
                        <AvatarFallback>{getAvatarInitials(userData.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard', { state: { activeTab: "clients" } })}>
                      <span>Voltar ao Dashboard</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            <main className="flex-1 dashboard-content bg-background p-6 overflow-auto h-[calc(100vh-80px)]">
              <div className="flex items-center justify-center h-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Cliente não encontrado</CardTitle>
                    <CardDescription>Não foi possível encontrar o cliente solicitado.</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button onClick={() => navigate('/dashboard', { state: { activeTab: "clients" } })}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar para o Dashboard
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <CustomSidebar activeTab="clients" onTabChange={(tab) => {
          if (tab === "documents") {
            navigate("/documents");
            return;
          }
          if (tab === "chatbot") {
            navigate("/dashboard", { state: { activeTab: "chatbot" } });
            return;
          }
          navigate('/dashboard', { state: { activeTab: "clients" } });
        }} />
        <div className="flex flex-col flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between h-[80px] border-b bg-cerrado-green1 text-white px-4">
            <div className="flex items-center gap-4">
              <div className="text-xl font-semibold">Detalhes do Cliente</div>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-4 cursor-pointer">
                    <div className="flex flex-col items-end mr-2">
                      <span className="font-medium">{userData.name}</span>
                      <span className="text-xs opacity-80">{userData.role}</span>
                    </div>
                    <Avatar>
                      <AvatarImage src={userData.avatar} alt={userData.name} />
                      <AvatarFallback>{getAvatarInitials(userData.name)}</AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 dashboard-content bg-background p-6 overflow-auto h-[calc(100vh-80px)]">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => navigate('/dashboard', { state: { activeTab: "clients" } })}>
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <h1 className="text-2xl font-bold">Detalhes do Cliente</h1>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={(value: "info" | "documents") => {
                  // Cliente Externo só pode ver documentos
                  if (userHierarchyLevelRaw === "Cliente Externo" && value === "info") {
                    return;
                  }
                  setActiveTab(value);
                }} className="space-y-6">
                <TabsList>
                  {userHierarchyLevelRaw !== "Cliente Externo" && (
                    <TabsTrigger value="info">Informações</TabsTrigger>
                  )}
                  <TabsTrigger value="documents">Documentos</TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                  <Card className="mb-6">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-6">
                        <Avatar className="w-28 h-28 border-2 border-gray-200">
                          {client.logoUrl ? (
                            <AvatarImage src={client.logoUrl} alt={client.name} />
                          ) : (
                            <AvatarFallback className="text-2xl bg-green-700 text-white">
                              {client.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>

                        <div className="flex-1 space-y-2">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <h2 className="text-2xl font-bold">{client.name}</h2>
                              <p className="text-gray-500">{client.project}</p>
                            </div>
                            <div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium
                                ${client.status === 'Em andamento' ? 'bg-blue-100 text-blue-800' : ''}
                                ${client.status === 'Concluído' ? 'bg-green-100 text-green-800' : ''}
                                ${client.status === 'Em análise' ? 'bg-purple-100 text-purple-800' : ''}
                                ${client.status === 'Aguardando documentos' ? 'bg-yellow-100 text-yellow-800' : ''}
                              `}>
                                {client.status}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            {client.contactName && (
                              <div>
                                <p className="text-sm text-gray-500">Nome do contato</p>
                                <p className="font-medium">{client.contactName}</p>
                              </div>
                            )}
                            {client.email && (
                              <div>
                                <p className="text-sm text-gray-500">E-mail</p>
                                <p className="font-medium">{client.email}</p>
                              </div>
                            )}
                            {client.phone && (
                              <div>
                                <p className="text-sm text-gray-500">Telefone</p>
                                <p className="font-medium">{client.phone}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-gray-500">Última atualização</p>
                              <p className="font-medium">{client.lastUpdate}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Informações do Projeto</CardTitle>
                      <CardDescription>
                        Detalhes sobre o projeto {client.project}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm text-gray-500">Nome do Projeto</Label>
                          <p className="font-medium">{client.project}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Status Atual</Label>
                          <p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium
                              ${client.status === 'Em andamento' ? 'bg-blue-100 text-blue-800' : ''}
                              ${client.status === 'Concluído' ? 'bg-green-100 text-green-800' : ''}
                              ${client.status === 'Em análise' ? 'bg-purple-100 text-purple-800' : ''}
                              ${client.status === 'Aguardando documentos' ? 'bg-yellow-100 text-yellow-800' : ''}
                            `}>
                              {client.status}
                            </span>
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Última Atualização</Label>
                          <p className="font-medium">{client.lastUpdate}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>
                            {isInRootFolder ? (
                              "Documentos"
                            ) : (
                              <div className="flex items-center gap-2">
                                {folderPath.map((folder, index) => (
                                  <div key={folder.id} className="flex items-center">
                                    <span>{folder.nome}</span>
                                    {index < folderPath.length - 1 && (
                                      <ChevronRight className="h-4 w-4 mx-2" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {isInRootFolder 
                              ? "Documentos associados a este cliente" 
                              : "Gerenciar documentos desta pasta"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                          {!isInRootFolder && (
                            <Button variant="ghost" onClick={handleBackToParent} className="flex items-center gap-2">
                              <ArrowLeft className="h-4 w-4" />
                              Voltar
                            </Button>
                          )}
                        </div>
                        {!isInRootFolder && (
                          <Button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="flex items-center gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Fazer Upload
                          </Button>
                        )}
                      </div>

                      {renderFolderContent()}

                      {/* Modal de criação de nova pasta */}
                      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Criar Nova Pasta</DialogTitle>
                            <DialogDescription>
                              Digite o nome da nova pasta que deseja criar.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="folder-name">Nome da Pasta</Label>
                              <Input
                                id="folder-name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Digite o nome da pasta"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreatingFolder(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleCreateCustomFolder} disabled={!newFolderName.trim()}>
                              Criar Pasta
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Modal de criação de sub-pasta */}
                      <Dialog open={isCreatingSubfolder} onOpenChange={setIsCreatingSubfolder}>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Criar Nova Sub-pasta</DialogTitle>
                            <DialogDescription>
                              Digite o nome da nova sub-pasta que deseja criar em "{currentParentFolder?.nome}".
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="subfolder-name">Nome da Sub-pasta</Label>
                              <Input
                                id="subfolder-name"
                                value={newSubfolderName}
                                onChange={(e) => setNewSubfolderName(e.target.value)}
                                placeholder="Digite o nome da sub-pasta"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreatingSubfolder(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleCreateSubfolder} disabled={!newSubfolderName.trim()}>
                              Criar Sub-pasta
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Modal de Upload Direto na Pasta */}
                      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
                          <DialogHeader>
                            <DialogTitle>Fazer Upload de Documento</DialogTitle>
                            <DialogDescription>
                              Upload para: {folderPath.length > 1 
                                ? `${folderPath[0].nome} > ${folderPath[1].nome}`
                                : folderPath[0]?.nome
                              }
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                            <div className="space-y-2">
                              <Label htmlFor="document-name-direct">Nome do Documento *</Label>
                              <Input 
                                id="document-name-direct" 
                                value={documentName}
                                onChange={(e) => setDocumentName(e.target.value)}
                                placeholder="Ex: Contrato de Prestação de Serviços"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="categoria">Categoria</Label>
                              <Select value={categoriaSelecionada} onValueChange={setCategoriaSelecionada}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categorias.map((categoria) => (
                                    <SelectItem key={categoria.id} value={categoria.id}>
                                      {categoria.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {categoriaSelecionada && (
                              <div className="space-y-2">
                                <Label htmlFor="subcategoria">Sub-categoria</Label>
                                <Select value={subCategoriaSelecionada} onValueChange={setSubCategoriaSelecionada}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma sub-categoria" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {subCategorias.map((subCategoria) => (
                                      <SelectItem key={subCategoria.id} value={subCategoria.id}>
                                        {subCategoria.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="space-y-2">
                              <Label htmlFor="observacao">Observação</Label>
                              <Input 
                                id="observacao" 
                                value={observacaoDocumento}
                                onChange={(e) => setObservacaoDocumento(e.target.value)}
                                placeholder="Observações sobre o documento (opcional)"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="document-file-direct">Arquivos *</Label>
                              <Input 
                                id="document-file-direct" 
                                type="file" 
                                multiple
                                onChange={handleFileSelect}
                              />
                              {selectedFile && fileUploads.length === 1 && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Arquivo selecionado: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                                </p>
                              )}
                            </div>

                            {/* Lista de arquivos selecionados */}
                            {fileUploads.length > 0 && (
                              <div className="space-y-3 flex-1 min-h-0 flex flex-col">
                                <div className="flex items-center justify-between flex-shrink-0">
                                  <Label>Arquivos selecionados ({fileUploads.length})</Label>
                                  {isMultiUploading && (
                                    <span className="text-sm text-muted-foreground">
                                      {fileUploads.filter(upload => upload.status === 'completed').length} de {fileUploads.length} concluídos
                                    </span>
                                  )}
                                </div>
                                
                                {/* Barra de progresso geral */}
                                {isMultiUploading && (
                                  <div className="space-y-2 flex-shrink-0">
                                    <Progress 
                                      value={(fileUploads.filter(upload => upload.status === 'completed').length / fileUploads.length) * 100} 
                                      className="h-3" 
                                    />
                                    <p className="text-xs text-muted-foreground text-center">
                                      Progresso geral: {Math.round((fileUploads.filter(upload => upload.status === 'completed').length / fileUploads.length) * 100)}%
                                    </p>
                                  </div>
                                )}
                                
                                <div className="space-y-2 flex-1 overflow-y-auto min-h-0 max-h-[420px]">
                                  {fileUploads.map((fileUpload) => (
                                    <div key={fileUpload.id} className="flex items-center justify-between p-2 border rounded-lg bg-muted/50">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {/* Ícone baseado no tipo de arquivo */}
                                        {fileUpload.file.type.startsWith('image/') ? (
                                          <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        ) : fileUpload.file.type === 'application/pdf' ? (
                                          <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                                        ) : (
                                          <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                        )}
                                        
                                        <div className="flex-1 min-w-0 space-y-1">
                                          <div className="flex items-center gap-2">
                                            <Input
                                              value={fileUpload.name}
                                              onChange={(e) => {
                                                setFileUploads(prev => prev.map(upload => 
                                                  upload.id === fileUpload.id 
                                                    ? { ...upload, name: e.target.value }
                                                    : upload
                                                ));
                                              }}
                                              className="h-6 text-xs"
                                              placeholder="Nome do documento"
                                              disabled={fileUpload.status === 'uploading' || fileUpload.status === 'completed'}
                                            />
                                            <Badge variant={fileUpload.status === 'completed' ? 'default' : fileUpload.status === 'error' ? 'destructive' : 'secondary'} className="text-xs px-2 py-0">
                                              {fileUpload.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                              {fileUpload.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                                              {fileUpload.status === 'uploading' && <Upload className="w-3 h-3 mr-1 animate-pulse" />}
                                              {fileUpload.status === 'pending' && 'Pendente'}
                                              {fileUpload.status === 'uploading' && 'Enviando...'}
                                              {fileUpload.status === 'completed' && 'Concluído'}
                                              {fileUpload.status === 'error' && 'Erro'}
                                            </Badge>
                                          </div>
                                          
                                          {/* Barra de progresso */}
                                          {fileUpload.status === 'uploading' && (
                                            <div className="space-y-1 bg-blue-50 p-2 rounded border border-blue-200">
                                              <div className="flex items-center justify-between">
                                                <span className="text-xs text-blue-600 font-medium">Enviando...</span>
                                                <span className="text-xs text-blue-600 font-medium">{Math.round(fileUpload.progress || 0)}%</span>
                                              </div>
                                              <Progress value={fileUpload.progress || 0} className="h-3 bg-blue-200" />
                                            </div>
                                          )}
                                          
                                          {/* Mensagem de erro */}
                                          {fileUpload.status === 'error' && fileUpload.error && (
                                            <p className="text-xs text-destructive">{fileUpload.error}</p>
                                          )}
                                          
                                          <p className="text-xs text-muted-foreground truncate">
                                            {Math.round(fileUpload.file.size / 1024)} KB • {fileUpload.file.name}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Botão para remover arquivo */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeFileUpload(fileUpload.id)}
                                        disabled={fileUpload.status === 'uploading'}
                                        className="ml-2 h-6 w-6 flex-shrink-0"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Botão para limpar todos */}
                                {fileUploads.length > 1 && (
                                  <div className="flex-shrink-0 pt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={clearAllUploads}
                                      disabled={isMultiUploading}
                                      className="w-full h-8 text-xs"
                                    >
                                      Limpar todos os arquivos
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <DialogFooter className="flex-shrink-0 pt-4">
                            <Button variant="outline" onClick={() => {
                              setIsUploadModalOpen(false);
                              setSelectedFile(null);
                              setDocumentName("");
                              setCategoriaSelecionada('');
                              setSubCategoriaSelecionada('');
                              setObservacaoDocumento('');
                              setFileUploads([]);
                            }}>
                              Cancelar
                            </Button>
                            <Button 
                              onClick={fileUploads.length > 1 ? handleMultiUpload : handleUploadToCurrentFolder} 
                              disabled={
                                (fileUploads.length === 0 && !selectedFile) || 
                                (fileUploads.length === 1 && !documentName) || 
                                isUploading || 
                                isMultiUploading
                              }
                            >
                              {isUploading || isMultiUploading ? "Fazendo upload..." : "Fazer Upload"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>

      {/* Diálogos de confirmação */}
      <ConfirmationDialog
        open={deleteFolderConfirmOpen}
        onOpenChange={setDeleteFolderConfirmOpen}
        title="Confirmar Exclusão da Pasta"
        description={`Tem certeza que deseja excluir a pasta "${folderToDelete?.name}"? Esta ação não poderá ser desfeita e todos os documentos dentro da pasta serão movidos para a pasta "Documentos gerais".`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={executeDeleteFolder}
        variant="destructive"
      />

      <ConfirmationDialog
        open={deleteDocumentConfirmOpen}
        onOpenChange={setDeleteDocumentConfirmOpen}
        title="Confirmar Exclusão do Documento"
        description={`Tem certeza que deseja excluir o documento "${documentToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={executeDeleteDocument}
        variant="destructive"
      />
    </SidebarProvider>
  );
};

export default ClientDetailsPage; 