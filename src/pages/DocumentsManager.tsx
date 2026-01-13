import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, Plus, Trash, Edit, FolderPlus, Bell, User, ChevronUp, ChevronDown, Search } from 'lucide-react';
import CustomSidebar from '@/components/CustomSidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getDocumentsByClient, deleteDocument, type FolderDocument } from '@/services/folderService';
import { getClientById } from '@/services/clientService';
import { useTabCloseLogout } from "@/hooks/useTabCloseLogout";
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

interface Categoria {
  id: string;
  nome: string;
}

interface SubCategoria {
  id: string;
  nome: string;
  categoriaId: string;
}

interface Documento {
  id: string;
  name: string;
  url: string;
  uploadDate: string;
  clientId: string;
  clienteNome: string;
  folderId: string;
  folderName: string;
  categoriaId?: string;
  categoriaNome?: string;
  subCategoriaId?: string;
  subCategoriaNome?: string;
}

const DocumentsManager = () => {
  // Ativa o logout automático quando a guia é fechada
  useTabCloseLogout();

  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("documents");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subCategorias, setSubCategorias] = useState<SubCategoria[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novaSubCategoria, setNovaSubCategoria] = useState("");
  const [categoriaParaSubCategoria, setCategoriaParaSubCategoria] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [editandoCategoria, setEditandoCategoria] = useState<Categoria | null>(null);
  const [editandoSubCategoria, setEditandoSubCategoria] = useState<SubCategoria | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [expandedClients, setExpandedClients] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para controle dos diálogos de confirmação
  const [deleteDocumentConfirmOpen, setDeleteDocumentConfirmOpen] = useState(false);
  const [deleteCategoryConfirmOpen, setDeleteCategoryConfirmOpen] = useState(false);
  const [deleteSubcategoryConfirmOpen, setDeleteSubcategoryConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{id: string; clientId: string; name: string} | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Categoria | null>(null);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<SubCategoria | null>(null);

  // Verificar autenticação e permissões
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (userAuth) {
        // Verificar se o usuário é Gerente ou Analista
        try {
          let isAuthorized = false;
          let userData = null;
          
          // Primeiro tentar buscar na coleção unificada
          try {
            const unifiedSnap = await getDocs(query(collection(db, "collaborators_unified"), where("email", "==", userAuth.email)));
            unifiedSnap.forEach((doc) => {
              userData = { id: doc.id, ...doc.data() };
              if (userData.hierarchyLevel === "Gerente" || userData.hierarchyLevel === "Analista") {
                isAuthorized = true;
              }
            });
            
            if (userData) {
              console.log(`✅ DocumentsManager: Usando coleção unificada para ${userAuth.email}`);
            }
          } catch (error) {
            console.log('⚠️ DocumentsManager: Fallback para coleções antigas');
          }
          
          // Se não encontrou na coleção unificada, o usuário não tem acesso
          if (!userData) {
            console.log("❌ Usuário não encontrado na coleção unificada");
          }
          
          if (isAuthorized && userData) {
            setUser(userData);
          } else {
            toast.error("Acesso não autorizado");
            navigate('/dashboard');
          }
        } catch (error) {
          console.error("Erro ao verificar permissões:", error);
          toast.error("Erro ao verificar permissões");
          navigate('/dashboard');
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Carregar categorias
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const categoriasSnapshot = await getDocs(collection(db, 'Categorias'));
        setCategorias(
          categoriasSnapshot.docs.map(doc => ({
            id: doc.id,
            nome: doc.data().nome
          }))
        );
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
        toast.error("Erro ao carregar categorias");
      }
    };

    fetchCategorias();
  }, []);

  // Carregar sub-categorias
  useEffect(() => {
    const fetchSubCategorias = async () => {
      try {
        const subCategoriasSnapshot = await getDocs(collection(db, 'SubCategorias'));
        setSubCategorias(
          subCategoriasSnapshot.docs.map(doc => ({
            id: doc.id,
            nome: doc.data().nome,
            categoriaId: doc.data().categoriaId
          }))
        );
      } catch (error) {
        console.error("Erro ao carregar sub-categorias:", error);
        toast.error("Erro ao carregar sub-categorias");
      }
    };

    fetchSubCategorias();
  }, []);

  // Carregar todos os documentos
  useEffect(() => {
    const fetchDocumentos = async () => {
      setIsLoading(true);
      try {
        // Buscar todos os clientes
        const clientesSnapshot = await getDocs(collection(db, 'clients'));
        const todosDocumentos: Documento[] = [];

        // Iterar por cada cliente para buscar seus documentos
        for (const clientDoc of clientesSnapshot.docs) {
          const clienteData = clientDoc.data();
          
          try {
            // Buscar documentos do cliente na coleção 'documents'
            const clientDocuments = await getDocumentsByClient(clientDoc.id);
            
            // Converter para o formato esperado
            clientDocuments.forEach((doc: FolderDocument) => {
              todosDocumentos.push({
                id: doc.id,
                name: doc.name,
                url: doc.url,
                uploadDate: doc.uploadDate,
                clientId: doc.clientId,
                clienteNome: clienteData.name,
                folderId: doc.folderId,
                folderName: doc.folderName,
                categoriaId: doc.categoriaId,
                categoriaNome: doc.categoriaNome,
                subCategoriaId: doc.subCategoriaId,
                subCategoriaNome: doc.subCategoriaNome
              });
            });
          } catch (error) {
            console.error(`Erro ao carregar documentos do cliente ${clientDoc.id}:`, error);
          }
        }

        setDocumentos(todosDocumentos);
      } catch (error) {
        console.error("Erro ao carregar documentos:", error);
        toast.error("Erro ao carregar documentos");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentos();
  }, []);

  // Adicionar categoria
  const handleAdicionarCategoria = async () => {
    if (!novaCategoria.trim()) {
      toast.error("Nome da categoria não pode estar vazio");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "Categorias"), {
        nome: novaCategoria.trim()
      });

      setCategorias([...categorias, { id: docRef.id, nome: novaCategoria.trim() }]);
      setNovaCategoria("");
      toast.success("Categoria adicionada com sucesso");
    } catch (error) {
      console.error("Erro ao adicionar categoria:", error);
      toast.error("Erro ao adicionar categoria");
    }
  };

  // Adicionar sub-categoria
  const handleAdicionarSubCategoria = async () => {
    if (!novaSubCategoria.trim() || !categoriaParaSubCategoria) {
      toast.error("Nome da subcategoria e categoria pai são obrigatórios");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "SubCategorias"), {
        nome: novaSubCategoria.trim(),
        categoriaId: categoriaParaSubCategoria
      });

      setSubCategorias([...subCategorias, { 
        id: docRef.id, 
        nome: novaSubCategoria.trim(), 
        categoriaId: categoriaParaSubCategoria 
      }]);
      
      setNovaSubCategoria("");
      toast.success("Subcategoria adicionada com sucesso");
    } catch (error) {
      console.error("Erro ao adicionar subcategoria:", error);
      toast.error("Erro ao adicionar subcategoria");
    }
  };

  // Remover categoria
  const handleRemoverCategoria = async (id: string) => {
    try {
      await deleteDoc(doc(db, "Categorias", id));
      setCategorias(prev => prev.filter(cat => cat.id !== id));
      
      // Remover também todas as subcategorias relacionadas
      const subcategoriasParaRemover = subCategorias.filter(subCat => subCat.categoriaId === id);
      for (const subCat of subcategoriasParaRemover) {
        await deleteDoc(doc(db, "SubCategorias", subCat.id));
      }
      setSubCategorias(prev => prev.filter(subCat => subCat.categoriaId !== id));
      
      toast.success("Categoria removida com sucesso!");
    } catch (error) {
      console.error("Erro ao remover categoria:", error);
      toast.error("Erro ao remover categoria");
    }
  };

  // Remover subcategoria
  const handleRemoverSubCategoria = async (id: string) => {
    try {
      await deleteDoc(doc(db, "SubCategorias", id));
      setSubCategorias(prev => prev.filter(subCat => subCat.id !== id));
      toast.success("Subcategoria removida com sucesso!");
    } catch (error) {
      console.error("Erro ao remover subcategoria:", error);
      toast.error("Erro ao remover subcategoria");
    }
  };

  // Editar categoria
  const handleEditarCategoria = async () => {
    if (!editandoCategoria || !editandoCategoria.nome.trim()) {
      toast.error("Nome da categoria não pode estar vazio");
      return;
    }

    try {
      await updateDoc(doc(db, "Categorias", editandoCategoria.id), {
        nome: editandoCategoria.nome.trim()
      });

      setCategorias(categorias.map(cat => 
        cat.id === editandoCategoria.id ? { ...cat, nome: editandoCategoria.nome.trim() } : cat
      ));
      
      setEditandoCategoria(null);
      toast.success("Categoria atualizada com sucesso");
    } catch (error) {
      console.error("Erro ao editar categoria:", error);
      toast.error("Erro ao editar categoria");
    }
  };

  // Editar subcategoria
  const handleEditarSubCategoria = async () => {
    if (!editandoSubCategoria || !editandoSubCategoria.nome.trim()) {
      toast.error("Nome da subcategoria não pode estar vazio");
      return;
    }

    try {
      await updateDoc(doc(db, "SubCategorias", editandoSubCategoria.id), {
        nome: editandoSubCategoria.nome.trim(),
        categoriaId: editandoSubCategoria.categoriaId
      });

      setSubCategorias(subCategorias.map(subCat => 
        subCat.id === editandoSubCategoria.id ? { ...subCat, nome: editandoSubCategoria.nome.trim(), categoriaId: editandoSubCategoria.categoriaId } : subCat
      ));
      
      setEditandoSubCategoria(null);
      toast.success("Subcategoria atualizada com sucesso");
    } catch (error) {
      console.error("Erro ao editar subcategoria:", error);
      toast.error("Erro ao editar subcategoria");
    }
  };

  // Baixar documento
  const handleDownloadDocument = (documentUrl: string, documentName: string) => {
    const a = document.createElement('a');
    a.href = documentUrl;
    a.download = documentName;
    a.click();
  };

  // Deletar documento
  const handleDeleteDocument = async (documentoId: string, clienteId: string) => {
    try {
      await deleteDocument(clienteId, documentoId);
      
      // Atualizar a interface removendo o documento da lista
      setDocumentos(prev => prev.filter(doc => doc.id !== documentoId));
      
      toast.success("Documento excluído com sucesso");
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      toast.error("Erro ao excluir documento");
    }
  };

  // Função para gerar as iniciais a partir do nome
  const getAvatarInitials = (name: string): string => {
    if (!name || name === "Usuário") return "U";
    const nameParts = name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
  };

  // Filtra documentos baseado no termo de busca
  const filteredDocumentos = documentos.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.categoriaNome && doc.categoriaNome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doc.subCategoriaNome && doc.subCategoriaNome.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Gera a lista de clientes com documentos filtrados
  const clientesComDocumentosFiltrados = Object.entries(
    filteredDocumentos.reduce((acc, doc) => {
      if (!acc[doc.clientId]) {
        acc[doc.clientId] = {
          nome: doc.clienteNome,
          documentos: []
        };
      }
      acc[doc.clientId].documentos.push(doc);
      return acc;
    }, {} as Record<string, { nome: string; documentos: Documento[] }>)
  );

  // Funções de confirmação
  const handleDeleteDocumentConfirm = (documento: Documento) => {
    setDocumentToDelete({
      id: documento.id,
      clientId: documento.clientId,
      name: documento.name
    });
    setDeleteDocumentConfirmOpen(true);
  };

  const handleDeleteCategoryConfirm = (categoria: Categoria) => {
    setCategoryToDelete(categoria);
    setDeleteCategoryConfirmOpen(true);
  };

  const handleDeleteSubcategoryConfirm = (subcategoria: SubCategoria) => {
    setSubcategoryToDelete(subcategoria);
    setDeleteSubcategoryConfirmOpen(true);
  };

  // Funções de execução após confirmação
  const executeDeleteDocument = () => {
    if (documentToDelete) {
      handleDeleteDocument(documentToDelete.id, documentToDelete.clientId);
      setDocumentToDelete(null);
    }
  };

  const executeDeleteCategory = () => {
    if (categoryToDelete) {
      handleRemoverCategoria(categoryToDelete.id);
      setCategoryToDelete(null);
    }
  };

  const executeDeleteSubcategory = () => {
    if (subcategoryToDelete) {
      handleRemoverSubCategoria(subcategoryToDelete.id);
      setSubcategoryToDelete(null);
    }
  };

  return (
    <div className="flex h-screen">
      <CustomSidebar activeTab="documents" onTabChange={(tab) => {
        if (tab === "documents") return;
        if (tab === "chatbot") {
          navigate("/dashboard", { state: { activeTab: "chatbot" } });
          return;
        }
        navigate(tab === "home" ? "/dashboard" : `/${tab}`);
      }} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-cerrado-green1 text-white p-3 h-[80px] shadow-md">
          <div className="flex justify-between items-center">
            <div className="text-xl font-semibold pl-14"></div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative p-2 rounded-full hover:bg-cerrado-green2 transition-colors">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3">
                        <span className="font-medium">{notification.title}</span>
                        <span className="text-sm text-gray-500">{notification.message}</span>
                        <span className="text-xs text-gray-400 mt-1">
                          {notification.createdAt.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      <span className="text-gray-500">Nenhuma notificação</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>


              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-4 cursor-pointer">
                    <div className="flex flex-col items-end mr-2">
                      <span className="font-medium">{user?.firstName || ''} {user?.lastName || ''}</span>
                      <span className="text-xs opacity-80">{user?.hierarchyLevel || 'Usuário'}</span>
                    </div>
                    <Avatar>
                      <AvatarImage src={user?.avatar || user?.photoURL || "/placeholder.svg"} alt={user?.firstName || "Usuário"} />
                      <AvatarFallback>{getAvatarInitials(`${user?.firstName || ""} ${user?.lastName || ""}`)}</AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <span>Voltar ao Dashboard</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        
        <main className="flex-1 dashboard-content bg-background p-6 overflow-auto h-[calc(100vh-80px)]">
          <h1 className="text-2xl font-bold mb-6 text-foreground">Gerenciamento de Documentos</h1>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="categories">Categorização</TabsTrigger>
              </TabsList>
              
              {activeTab === "documents" && (
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Buscar documentos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 pl-9"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                </div>
              )}
            </div>
            
            {/* Tab de Documentos */}
            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Todos os Documentos</CardTitle>
                  <CardDescription>
                    Documentos de todos os clientes organizados por categoria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p>Carregando documentos...</p>
                  ) : (
                    <>
                      {/* Agrupar documentos por cliente */}
                      {clientesComDocumentosFiltrados.length > 0 ? (
                        <div className="space-y-6">
                          {clientesComDocumentosFiltrados.map(([clienteId, { nome, documentos }]) => (
                            <div key={clienteId} className="border rounded-lg overflow-hidden">
                              <div 
                                className="bg-muted p-3 font-medium cursor-pointer flex justify-between items-center hover:bg-muted/80 transition-colors"
                                onClick={() => {
                                  if (expandedClients.includes(clienteId)) {
                                    setExpandedClients(expandedClients.filter(id => id !== clienteId));
                                  } else {
                                    setExpandedClients([...expandedClients, clienteId]);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{nome}</span>
                                  <span className="text-sm text-muted-foreground">({documentos.length} documento{documentos.length !== 1 ? 's' : ''})</span>
                                </div>
                                {expandedClients.includes(clienteId) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                              
                              {expandedClients.includes(clienteId) && (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Nome</TableHead>
                                      <TableHead>Categoria</TableHead>
                                      <TableHead>Subcategoria</TableHead>
                                      <TableHead>Data</TableHead>
                                      <TableHead>Ações</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {documentos.map((doc) => (
                                      <TableRow key={doc.id}>
                                        <TableCell>{doc.name}</TableCell>
                                        <TableCell>{doc.categoriaNome || "Não categorizado"}</TableCell>
                                        <TableCell>{doc.subCategoriaNome || "N/A"}</TableCell>
                                        <TableCell>{doc.uploadDate}</TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Button 
                                              variant="ghost" 
                                              size="icon"
                                              onClick={() => handleDownloadDocument(doc.url, doc.name)}
                                            >
                                              <Download className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="icon"
                                              onClick={() => handleDeleteDocumentConfirm(doc)}
                                              className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                            >
                                              <Trash className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-4">Nenhum documento encontrado</p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Tab de Categorias */}
            <TabsContent value="categories" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Painel de Categorias */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gerenciar Categorias</CardTitle>
                    <CardDescription>
                      Adicione e gerencie as categorias de documentos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-4">
                      <Input 
                        placeholder="Nova categoria" 
                        value={novaCategoria}
                        onChange={(e) => setNovaCategoria(e.target.value)}
                      />
                      <Button onClick={handleAdicionarCategoria}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categorias.map((categoria) => (
                          <TableRow key={categoria.id}>
                            <TableCell>{categoria.nome}</TableCell>
                            <TableCell className="flex gap-2">
                              <Button 
                                variant="ghost"
                                onClick={() => setEditandoCategoria(categoria)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost"
                                onClick={() => handleDeleteCategoryConfirm(categoria)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Painel de Subcategorias */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gerenciar Subcategorias</CardTitle>
                    <CardDescription>
                      Adicione e gerencie as subcategorias de documentos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-4">
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={categoriaParaSubCategoria}
                        onChange={(e) => setCategoriaParaSubCategoria(e.target.value)}
                      >
                        <option value="">Selecione uma Categoria</option>
                        {categorias.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nome}</option>
                        ))}
                      </select>
                      <Input 
                        placeholder="Nova subcategoria" 
                        value={novaSubCategoria}
                        onChange={(e) => setNovaSubCategoria(e.target.value)}
                      />
                      <Button onClick={handleAdicionarSubCategoria}>
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                    
                    <div className="mb-4">
                      <Label>Filtrar por categoria</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                        value={categoriaSelecionada}
                        onChange={(e) => setCategoriaSelecionada(e.target.value)}
                      >
                        <option value="">Todas as categorias</option>
                        {categorias.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nome}</option>
                        ))}
                      </select>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subCategorias
                          .filter(subCat => !categoriaSelecionada || subCat.categoriaId === categoriaSelecionada)
                          .map((subCategoria) => (
                            <TableRow key={subCategoria.id}>
                              <TableCell>{subCategoria.nome}</TableCell>
                              <TableCell>
                                {categorias.find(cat => cat.id === subCategoria.categoriaId)?.nome || "N/A"}
                              </TableCell>
                              <TableCell className="flex gap-2">
                                <Button 
                                  variant="ghost"
                                  onClick={() => setEditandoSubCategoria(subCategoria)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost"
                                  onClick={() => handleDeleteSubcategoryConfirm(subCategoria)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
              
              {/* Dialog para editar categoria */}
              {editandoCategoria && (
                <Dialog open={!!editandoCategoria} onOpenChange={() => setEditandoCategoria(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Categoria</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Label htmlFor="edit-categoria-name">Nome da Categoria</Label>
                      <Input 
                        id="edit-categoria-name"
                        value={editandoCategoria.nome}
                        onChange={(e) => setEditandoCategoria({...editandoCategoria, nome: e.target.value})}
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleEditarCategoria}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              {/* Dialog para editar subcategoria */}
              {editandoSubCategoria && (
                <Dialog open={!!editandoSubCategoria} onOpenChange={() => setEditandoSubCategoria(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Subcategoria</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Label htmlFor="edit-subcategoria-name">Nome da Subcategoria</Label>
                      <Input 
                        id="edit-subcategoria-name"
                        value={editandoSubCategoria.nome}
                        onChange={(e) => setEditandoSubCategoria({...editandoSubCategoria, nome: e.target.value})}
                      />
                      <Label htmlFor="edit-subcategoria-category">Categoria</Label>
                      <select 
                        id="edit-subcategoria-category"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={editandoSubCategoria.categoriaId}
                        onChange={(e) => setEditandoSubCategoria({...editandoSubCategoria, categoriaId: e.target.value})}
                      >
                        {categorias.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nome}</option>
                        ))}
                      </select>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleEditarSubCategoria}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Diálogos de confirmação */}
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

      <ConfirmationDialog
        open={deleteCategoryConfirmOpen}
        onOpenChange={setDeleteCategoryConfirmOpen}
        title="Confirmar Exclusão da Categoria"
        description={`Tem certeza que deseja excluir a categoria "${categoryToDelete?.nome}"? Esta ação também removerá todas as subcategorias relacionadas e não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={executeDeleteCategory}
        variant="destructive"
      />

      <ConfirmationDialog
        open={deleteSubcategoryConfirmOpen}
        onOpenChange={setDeleteSubcategoryConfirmOpen}
        title="Confirmar Exclusão da Subcategoria"
        description={`Tem certeza que deseja excluir a subcategoria "${subcategoryToDelete?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={executeDeleteSubcategory}
        variant="destructive"
      />
    </div>
  );
};

export default DocumentsManager; 