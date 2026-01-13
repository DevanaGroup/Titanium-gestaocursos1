import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building, Calendar, User, FileText, CheckCircle, Clock, AlertCircle, ArrowLeft, Send, Download, CheckCircle2, XCircle, AlertTriangle, Eye, ClipboardCheck, Trash2, MoreVertical, Edit, Grid, List, ChevronRight, ChevronLeft, PauseCircle, RotateCcw, FileTextIcon, MessageSquare, CheckSquare, X, Globe, BarChart3, Search, Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where, addDoc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuthContext } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { usePageTitle } from '@/contexts/PageTitleContext';
import { Client } from "@/types";
import { getClients } from "@/services/clientService";
import { Preset } from "@/types/checklist";

type ProjectStatus = "Iniciado" | "Em Andamento" | "Aguardando Documentos" | "Em Revisão" | "Concluído" | "Pendente";

interface Project {
  id: string;
  nome: string;
  status: ProjectStatus;
  progresso: number;
  cliente?: {
    id: string;
    nome: string;
    email: string;
    empresa: string;
  };
  clienteId?: string;
  consultor?: string;
  criadoPor?: string;
  criadoPorNome?: string;
  dataInicio: string;
  dataCriacao: string;
  previsaoConclusao?: string;
  descricao?: string;
  customAccordions?: Array<{
    id: string;
    title: string;
    items: any[];
  }>;
  modules?: any[];
  observacoes?: string;
  solicitacoes?: Array<{
    id: string;
    titulo: string;
    descricao: string;
    status: "Pendente" | "Em Análise" | "Atendida" | "Rejeitada";
    dataLimite?: string;
    criadoPor: string;
    criadoEm: string;
  }>;
  comunicacoes?: Array<{
    id: string;
    de: string;
    para: string;
    assunto: string;
    mensagem: string;
    data: string;
    tipo: string;
    lida: boolean;
  }>;
}

const Projects = () => {
  const navigate = useNavigate();
  const { userData } = useAuthContext();
  const isMobile = useIsMobile();
  const { setPageTitle } = usePageTitle();
  const [projetos, setProjetos] = useState<Project[]>([]);
  const [clientes, setClientes] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<'client-selection' | 'project-list'>('client-selection');
  const [listView, setListView] = useState<'cards' | 'list'>('list');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [selectedClienteForNew, setSelectedClienteForNew] = useState<string>('none');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [filtroNomeCliente, setFiltroNomeCliente] = useState('');
  const [filtroStatusCliente, setFiltroStatusCliente] = useState('todos');
  const [buscaExpandida, setBuscaExpandida] = useState(false);
  const [filtroExpandido, setFiltroExpandido] = useState(false);
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarApenasAtivos, setMostrarApenasAtivos] = useState(true);

  const isAdmin = userData?.uid ? true : false; // Simplificado para o projeto atual

  useEffect(() => {
    setPageTitle('');
  }, [setPageTitle]);

  useEffect(() => {
    loadClientes();
    loadProjetos();
    loadPresets();
  }, []);

  // Força visualização de cards no mobile
  useEffect(() => {
    if (isMobile) {
      setListView('cards');
    }
  }, [isMobile]);

  const loadClientes = async () => {
    try {
      setLoadingClientes(true);
      const clientesData = await getClients();
      // Adaptar Client para o formato esperado
      const clientesAdaptados = clientesData.map(cliente => ({
        ...cliente,
        nome: cliente.name,
        empresa: cliente.project || '',
        status: cliente.status === 'Em andamento' ? 'ativo' as const : 
                cliente.status === 'Concluído' ? 'inativo' as const : 
                'ativo' as const,
      }));
      setClientes(clientesAdaptados as any);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoadingClientes(false);
    }
  };

  const loadPresets = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "presets"));
      const presetsData: Preset[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        presetsData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Preset);
      });
      
      setPresets(presetsData);
    } catch (error) {
      console.error("Erro ao carregar presets:", error);
      toast.error("Erro ao carregar presets");
    }
  };

  const handleCreateNewProject = async () => {
    if (!selectedPresetId) {
      toast.error("Selecione um preset para o projeto");
      return;
    }

    try {
      // Buscar dados do preset selecionado
      const selectedPreset = presets.find(p => p.id === selectedPresetId);
      if (!selectedPreset) {
        toast.error("Preset não encontrado");
        return;
      }

      // Buscar dados do cliente se selecionado
      let clienteData = undefined;
      if (selectedClienteForNew && selectedClienteForNew !== 'none') {
        const selectedClient = clientes.find(c => c.id === selectedClienteForNew);
        if (selectedClient) {
          clienteData = {
            id: selectedClient.id,
            nome: selectedClient.name,
            email: selectedClient.email || "",
            empresa: selectedClient.project || "",
          };
        }
      }

      // Converter preset para módulos
      const modules = selectedPreset.areas.map((area, mIdx) => {
        const moduleItems = area.items.map((item, iIdx) => {
          const ncId = `nc_${Date.now()}_${mIdx}_${iIdx}_0`;
          
          return {
            id: `item_${Date.now()}_${mIdx}_${iIdx}`,
            titulo: item.title,
            descricao: item.description,
            ordem: iIdx,
            ncs: [{
              id: ncId,
              numero: 1,
              ncTitulo: `NC 1`,
              descricao: item.description,
              perguntas: [{
                id: `question_${Date.now()}_${mIdx}_${iIdx}_0`,
                text: item.title,
                weight: 2,
                required: true,
                responseOptions: ['na', 'very_bad', 'good'],
                response: null,
                order: 0,
              }],
              pontuacaoAtual: 0,
              pontuacaoMaxima: 20,
              status: 'pending' as const,
            }],
            pontuacaoAtual: 0,
            pontuacaoMaxima: 20,
          };
        });

        return {
          id: `module_${Date.now()}_${mIdx}`,
          titulo: area.name,
          ordem: mIdx,
          itens: moduleItems,
        };
      });

      // Criar projeto
      const now = new Date();
      const newProjectData: any = {
        nome: 'Novo Projeto',
        clienteId: selectedClienteForNew && selectedClienteForNew !== 'none' ? selectedClienteForNew : null,
        cliente: clienteData,
        presetId: selectedPresetId,
        modules: modules,
        criadoEm: now,
        atualizadoEm: now,
        criadoPor: userData?.uid || '',
        status: 'Em Andamento' as ProjectStatus,
        progresso: 0,
      };

      // Criar documento no Firestore
      const docRef = await addDoc(collection(db, 'projetos'), newProjectData);

      toast.success('Projeto criado! Redirecionando...');
      setShowNewProjectModal(false);
      setSelectedClienteForNew('none');
      setSelectedPresetId('');

      // Navegar para visualização do projeto
      navigate(`/projetos/${docRef.id}`);
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      toast.error('Erro ao criar projeto');
    }
  };

  const loadProjetos = async () => {
    try {
      setLoading(true);
      const projetosRef = collection(db, 'projetos');
      const querySnapshot = await getDocs(projetosRef);

      const projetosData = await Promise.all(querySnapshot.docs.map(async projectDoc => {
        const data = projectDoc.data();

        // Normalizar campos de data
        const dataInicio = data.dataInicio || data.dataCriacao || data.criadoEm?.toDate?.()?.toISOString?.() || new Date().toISOString();
        const dataCriacao = data.dataCriacao || data.criadoEm?.toDate?.()?.toISOString?.() || new Date().toISOString();

        // Buscar nome do usuário que criou o projeto
        let criadoPorNome = 'Não definido';
        if (data.criadoPor) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.criadoPor));
            if (userDoc.exists()) {
              const userData = userDoc.data() as { nome?: string; displayName?: string; email?: string };
              criadoPorNome = userData.nome || userData.displayName || userData.email || 'Usuário não encontrado';
            }
          } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
          }
        }

        const projeto: Project = {
          id: projectDoc.id,
          nome: data.nome || 'Projeto sem nome',
          status: data.status || 'Pendente' as ProjectStatus,
          progresso: data.progresso || 0,
          cliente: data.cliente || null,
          clienteId: data.clienteId || data.cliente?.id || null,
          consultor: data.consultor || 'Não definido',
          criadoPor: data.criadoPor || null,
          criadoPorNome: criadoPorNome,
          dataInicio,
          dataCriacao,
          previsaoConclusao: data.previsaoConclusao || calculatePrevisao(dataInicio),
          descricao: data.observacoes || data.descricao || '',
          customAccordions: data.customAccordions || data.accordions || [],
          modules: data.modules || [],
          observacoes: data.observacoes || '',
          solicitacoes: data.solicitacoes || [],
          comunicacoes: data.comunicacoes || []
        };

        return projeto;
      }));

      // Ordenar os projetos por data de criação (mais recentes primeiro)
      projetosData.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());

      setProjetos(projetosData);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrevisao = (dataInicio: string) => {
    const inicio = new Date(dataInicio);
    const previsao = new Date(inicio);
    previsao.setMonth(previsao.getMonth() + 3); // 3 meses de previsão padrão
    return previsao.toISOString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluído": return "bg-green-100 text-green-800";
      case "Em Andamento": return "bg-blue-100 text-blue-800";
      case "Em Revisão": return "bg-yellow-100 text-yellow-800";
      case "Aguardando Documentos": return "bg-orange-100 text-orange-800";
      case "Iniciado": return "bg-purple-100 text-purple-800";
      case "Pendente": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getClientStatusColor = (status: string) => {
    switch (status) {
      case "ativo": return "bg-green-100 text-green-800";
      case "suspenso": return "bg-yellow-100 text-yellow-800";
      case "inativo": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleSelectClient = (cliente: Client) => {
    setSelectedClient(cliente);
    setViewMode('project-list');
  };

  const handleBackToClientSelection = () => {
    setSelectedClient(null);
    setViewMode('client-selection');
  };

  const getProjetosDoCliente = (): Project[] => {
    if (!selectedClient) {
      return projetos.filter(projeto =>
        !projeto.clienteId && !projeto.cliente?.id
      );
    }

    return projetos.filter(projeto =>
      projeto.clienteId === selectedClient.id ||
      projeto.cliente?.id === selectedClient.id
    );
  };

  // Verifica se um cliente tem projetos ativos
  const clienteTemProjetosAtivos = (clienteId: string): boolean => {
    const projetosAtivos = projetos.filter(projeto => {
      const isClienteDoProjeto = projeto.clienteId === clienteId || projeto.cliente?.id === clienteId;
      if (!isClienteDoProjeto) return false;
      
      // Status considerados ativos (não concluídos)
      const statusAtivos: ProjectStatus[] = ["Iniciado", "Em Andamento", "Aguardando Documentos", "Em Revisão", "Pendente"];
      return statusAtivos.includes(projeto.status);
    });
    
    return projetosAtivos.length > 0;
  };

  const getClientesFiltrados = () => {
    return clientes.filter(cliente => {
      const nomeMatch = (cliente.name || '').toLowerCase().includes(filtroNomeCliente.toLowerCase()) ||
        (cliente.project || '').toLowerCase().includes(filtroNomeCliente.toLowerCase()) ||
        (cliente.email || '').toLowerCase().includes(filtroNomeCliente.toLowerCase());
      const statusMatch = filtroStatusCliente === 'todos' || cliente.status === filtroStatusCliente;
      
      // Filtrar por projetos ativos se mostrarApenasAtivos for true
      if (mostrarApenasAtivos) {
        // Mostrar apenas clientes que têm projetos ativos
        const temProjetosAtivos = clienteTemProjetosAtivos(cliente.id);
        return nomeMatch && statusMatch && temProjetosAtivos;
      }
      
      return nomeMatch && statusMatch;
    });
  };

  const handleViewDetails = (projeto: Project) => {
    navigate(`/projetos/${projeto.id}`);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setDeletingProject(projectId);

      // Excluir relatórios relacionados ao projeto (se existirem)
      try {
        const relatoriosRef = collection(db, 'relatorios');
        const relatoriosQuery = query(relatoriosRef, where('projectId', '==', projectId));
        const relatoriosSnapshot = await getDocs(relatoriosQuery);
        
        const deletePromises = relatoriosSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      } catch (error) {
        console.warn('Erro ao excluir relatórios relacionados:', error);
      }

      // Excluir o projeto
      const projectRef = doc(db, 'projetos', projectId);
      await deleteDoc(projectRef);

      setProjetos(prev => prev.filter(p => p.id !== projectId));

      toast.success('Projeto deletado com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar projeto:', error);
      toast.error('Erro ao deletar projeto');
    } finally {
      setDeletingProject(null);
    }
  };

  const filteredProjects = projetos.filter((project) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      project.nome.toLowerCase().includes(searchLower) ||
      project.cliente?.nome.toLowerCase().includes(searchLower) ||
      project.cliente?.email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Botão Voltar */}
      {viewMode === 'project-list' && (
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToClientSelection}
                className="w-8 h-8 p-0 text-cerrado-green1 hover:bg-cerrado-green1/10 hover:text-cerrado-green2 transition-all duration-200 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Voltar para Clientes</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-4">
          {viewMode === 'client-selection' && (
            <>
              <h2 className="hidden md:block text-3xl font-bold text-cerrado-green1">Projetos</h2>
              <p className="hidden md:block text-gray-600 mt-2">
                Selecione um cliente para ver seus projetos ou visualize projetos sem clientes
              </p>
            </>
          )}

          {viewMode === 'project-list' && selectedClient && (
            <div className="min-w-0 flex-1">
              <h2 className="text-3xl font-bold text-cerrado-green1 break-words">
                Projetos de {selectedClient.name}
              </h2>
            </div>
          )}

          {viewMode === 'project-list' && !selectedClient && (
            <div className="min-w-0 flex-1">
              <h2 className="text-3xl font-bold text-cerrado-green1 break-words">
                Projetos Sem Cliente
              </h2>
              <p className="text-gray-600 mt-2 break-words">
                {getProjetosDoCliente().length} projeto(s) sem cliente associado
              </p>
            </div>
          )}
        </div>

        {/* Botões de visualização */}
        {(viewMode === 'client-selection' || viewMode === 'project-list') && (
          <div className="hidden md:flex items-center space-x-2">
            <Button
              variant={listView === 'cards' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setListView('cards')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={listView === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setListView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Layout Mobile - Título fixo abaixo do header */}
      {viewMode === 'client-selection' && (
        <div className="md:hidden fixed top-6 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-cerrado-green1">Projetos</h2>
          <Button
            onClick={() => setShowNewProjectModal(true)}
            size="sm"
            className="bg-cerrado-green1 hover:bg-cerrado-green2 text-white p-2 h-9 w-9 rounded-full"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Espaçamento para compensar o título fixo no mobile */}
      {viewMode === 'client-selection' && (
        <div className="md:hidden h-6"></div>
      )}

      {viewMode === 'client-selection' && (
        <>
          {listView === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card Projetos Sem Cliente */}
              <Card
                className="hidden md:flex border-2 border-dashed border-gray-300 hover:border-cerrado-green1 transition-colors cursor-pointer group"
                onClick={() => setViewMode('project-list')}
              >
                <CardContent className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-cerrado-green1/20 transition-colors">
                    <FileText className="h-8 w-8 text-gray-400 group-hover:text-cerrado-green1" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 group-hover:text-cerrado-green1">
                    Projetos Sem Cliente
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">
                    {projetos.filter(p => !p.clienteId && !p.cliente?.id).length} projeto(s) sem cliente associado
                  </p>
                </CardContent>
              </Card>

              {/* Loading ou Cards dos Clientes */}
              {loadingClientes ? (
                <div className="col-span-full flex items-center justify-center h-48">
                  <p className="text-gray-500">Carregando clientes...</p>
                </div>
              ) : clientes.length === 0 ? (
                <div className="col-span-full flex items-center justify-center h-48">
                  <p className="text-gray-500">Nenhum cliente encontrado. Crie seu primeiro cliente!</p>
                </div>
              ) : (
                getClientesFiltrados().map((cliente) => (
                  <Card
                    key={cliente.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleSelectClient(cliente)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <User className="h-5 w-5 text-cerrado-green1 flex-shrink-0" />
                          <CardTitle className="text-cerrado-green1 truncate">
                            {cliente.name}
                          </CardTitle>
                        </div>
                        <Badge className={`ml-2 flex-shrink-0 ${getClientStatusColor(cliente.status || 'ativo')}`}>
                          {cliente.status || 'ativo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center space-x-1 mb-1">
                            <Building className="h-3 w-3" />
                            <span>Empresa: {cliente.project || 'Não informada'}</span>
                          </div>
                          <div className="flex items-center space-x-1 mb-1">
                            <User className="h-3 w-3" />
                            <span>Email: {cliente.email || 'Não informado'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>Projetos: {projetos.filter(p => p.clienteId === cliente.id || p.cliente?.id === cliente.id).length}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Botão Novo Projeto */}
              <div className="hidden md:flex justify-end">
                <Button
                  onClick={() => setShowNewProjectModal(true)}
                  className="flex items-center space-x-2 bg-cerrado-green1 hover:bg-cerrado-green2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Projeto</span>
                </Button>
              </div>

              {/* Tabela de Clientes */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-4 relative pr-[264px] sm:pr-[264px]">
                  <CardTitle className="text-cerrado-green1">Clientes ({getClientesFiltrados().length})</CardTitle>
                  
                  {/* Container de busca e filtro - sempre à direita, posição absoluta */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex items-center justify-end gap-2">
                    {/* Botão de Filtro */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMostrarApenasAtivos(!mostrarApenasAtivos)}
                          className={`h-9 w-9 p-0 border-0 ${mostrarApenasAtivos ? 'bg-cerrado-green1 hover:bg-cerrado-green2 text-white' : ''}`}
                        >
                          <Filter className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{mostrarApenasAtivos ? 'Mostrando apenas clientes com projetos ativos' : 'Mostrando todos os clientes'}</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {/* Botão de Busca */}
                    {!buscaExpandida ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBuscaExpandida(true)}
                        className="h-9 w-9 p-0"
                      >
                        <Search className="h-5 w-5" />
                      </Button>
                    ) : (
                      <div className="relative bg-white rounded-md shadow-lg border border-gray-200 w-[256px] animate-in slide-in-from-right duration-200">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                        <Input
                          placeholder="Buscar..."
                          value={filtroNomeCliente}
                          onChange={(e) => setFiltroNomeCliente(e.target.value)}
                          className="w-full pl-10 pr-10 h-9 border-0 focus-visible:ring-0"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBuscaExpandida(false);
                            setFiltroNomeCliente('');
                          }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 p-0 hover:bg-gray-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingClientes ? (
                    <div className="flex items-center justify-center h-48">
                      <p className="text-gray-500">Carregando clientes...</p>
                    </div>
                  ) : clientes.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                      <p className="text-gray-500">Nenhum cliente encontrado. Crie seu primeiro cliente!</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Projetos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Linha para Projetos Sem Cliente */}
                        <TableRow
                          className="hidden md:table-row cursor-pointer hover:bg-cerrado-green1/5 border-t-2 border-gray-200"
                          onClick={() => setViewMode('project-list')}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-700">Projetos Sem Cliente</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500">-</TableCell>
                          <TableCell className="text-gray-500">-</TableCell>
                          <TableCell>
                            <Badge className="bg-gray-100 text-gray-800">
                              Sem Cliente
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-cerrado-green1">
                            {projetos.filter(p => !p.clienteId && !p.cliente?.id).length}
                          </TableCell>
                        </TableRow>

                        {getClientesFiltrados().map((cliente) => (
                          <TableRow
                            key={cliente.id}
                            className="cursor-pointer hover:bg-cerrado-green1/5"
                            onClick={() => handleSelectClient(cliente)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-cerrado-green1" />
                                <span className="text-cerrado-green1">{cliente.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Building className="h-3 w-3" />
                                <span>{cliente.project || 'Não informada'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{cliente.email || 'Não informado'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getClientStatusColor(cliente.status || 'ativo')}>
                                {cliente.status || 'ativo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <FileText className="h-3 w-3" />
                                <span>{projetos.filter(p => p.clienteId === cliente.id || p.cliente?.id === cliente.id).length}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {viewMode === 'project-list' && (
        <>
          {listView === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full flex items-center justify-center h-48">
                  <p className="text-gray-500">Carregando projetos...</p>
                </div>
              ) : getProjetosDoCliente().length === 0 ? (
                <div className="col-span-full flex items-center justify-center h-48">
                  <p className="text-gray-500">Nenhum projeto encontrado. Crie seu primeiro projeto!</p>
                </div>
              ) : (
                getProjetosDoCliente().map((projeto) => (
                  <Card
                    key={projeto.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleViewDetails(projeto)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="flex items-center space-x-2">
                            <Building className="h-5 w-5 text-cerrado-green1" />
                            <span className="text-cerrado-green1">{projeto.nome}</span>
                          </CardTitle>
                          <Badge className={getStatusColor(projeto.status)}>
                            {projeto.status}
                          </Badge>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(projeto);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/projetos/${projeto.id}/edit`);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar Projeto
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onSelect={(e) => e.preventDefault()}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {deletingProject === projeto.id ? 'Deletando...' : 'Excluir Projeto'}
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[90vw] max-w-[400px] rounded-2xl p-4 sm:p-6">
                                  <AlertDialogHeader className="space-y-2">
                                    <AlertDialogTitle className="text-base sm:text-lg">Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription className="text-xs sm:text-sm">
                                      Tem certeza que deseja excluir o projeto "{projeto.nome}"?
                                      Esta ação não pode ser desfeita e todos os dados relacionados ao projeto serão perdidos permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="gap-2 sm:gap-0">
                                    <AlertDialogCancel
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-9 text-sm sm:h-10"
                                    >
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProject(projeto.id);
                                      }}
                                      className="bg-red-600 hover:bg-red-700 h-9 text-sm sm:h-10"
                                    >
                                      Confirmar Exclusão
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Progresso</span>
                            <span className="text-cerrado-green1 font-medium">{projeto.progresso}%</span>
                          </div>
                          <Progress
                            value={projeto.progresso}
                            className="h-2"
                          />
                        </div>
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center space-x-1 mb-1">
                            <User className="h-3 w-3" />
                            <span>Consultor: {projeto.consultor}</span>
                          </div>
                          <div className="flex items-center space-x-1 mb-1">
                            <Calendar className="h-3 w-3" />
                            <span>Previsão: {projeto.previsaoConclusao ? new Date(projeto.previsaoConclusao).toLocaleDateString('pt-BR') : 'Não definida'}</span>
                          </div>
                          {projeto.cliente && (
                            <div className="flex items-center space-x-1">
                              <Building className="h-3 w-3" />
                              <span>Cliente: {projeto.cliente.nome}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tabela de Projetos */}
              <Card>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-48">
                      <p className="text-gray-500">Carregando projetos...</p>
                    </div>
                  ) : getProjetosDoCliente().length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                      <p className="text-gray-500">Nenhum projeto encontrado. Crie seu primeiro projeto!</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Progresso</TableHead>
                          <TableHead className="text-center">Criado por</TableHead>
                          <TableHead className="text-center">Início</TableHead>
                          <TableHead>Previsão</TableHead>
                          <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getProjetosDoCliente().map((projeto) => (
                          <TableRow
                            key={projeto.id}
                            className="cursor-pointer hover:bg-cerrado-green1/5"
                            onClick={() => handleViewDetails(projeto)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4 text-cerrado-green1" />
                                <span className="text-cerrado-green1">{projeto.nome}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={getStatusColor(projeto.status)}>
                                {projeto.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm text-cerrado-green1 font-medium">
                                {projeto.progresso}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{projeto.criadoPorNome}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(projeto.dataInicio).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{projeto.previsaoConclusao ? new Date(projeto.previsaoConclusao).toLocaleDateString('pt-BR') : 'Não definida'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(projeto);
                                  }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Detalhes
                                  </DropdownMenuItem>
                                  {isAdmin && (
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/projetos/${projeto.id}/edit`);
                                    }}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar Projeto
                                    </DropdownMenuItem>
                                  )}
                                  {isAdmin && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                          onSelect={(e) => e.preventDefault()}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          {deletingProject === projeto.id ? 'Deletando...' : 'Excluir Projeto'}
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="w-[90vw] max-w-[400px] rounded-2xl p-4 sm:p-6">
                                        <AlertDialogHeader className="space-y-2">
                                          <AlertDialogTitle className="text-base sm:text-lg">Confirmar Exclusão</AlertDialogTitle>
                                          <AlertDialogDescription className="text-xs sm:text-sm">
                                            Tem certeza que deseja excluir o projeto "{projeto.nome}"?
                                            Esta ação não pode ser desfeita e todos os dados relacionados ao projeto serão perdidos permanentemente.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="gap-2 sm:gap-0">
                                          <AlertDialogCancel
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-9 text-sm sm:h-10"
                                          >
                                            Cancelar
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteProject(projeto.id);
                                            }}
                                            className="bg-red-600 hover:bg-red-700 h-9 text-sm sm:h-10"
                                          >
                                            Confirmar Exclusão
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Modal de Novo Projeto */}
      <Dialog open={showNewProjectModal} onOpenChange={setShowNewProjectModal}>
        <DialogContent className="w-[90vw] max-w-[400px] sm:max-w-[450px] rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Criar Novo Projeto</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Configure as opções iniciais para o novo projeto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
            {/* Seleção de Cliente */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cliente (Opcional)</Label>
              <Select value={selectedClienteForNew} onValueChange={setSelectedClienteForNew}>
                <SelectTrigger className="h-9 sm:h-10">
                  <SelectValue placeholder="Selecione um cliente ou deixe em branco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">Nenhum cliente selecionado</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id} className="text-sm">
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4" />
                        <span>{cliente.name} - {cliente.project || 'Sem empresa'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleção de Preset */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preset *</Label>
              <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                <SelectTrigger className="h-9 sm:h-10">
                  <SelectValue placeholder="Selecione um preset..." />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id} className="text-sm">
                      {preset.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {presets.length === 0 && (
                <p className="text-xs text-gray-500">
                  Nenhum preset disponível. Crie um preset primeiro.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowNewProjectModal(false);
                setSelectedClienteForNew('none');
                setSelectedPresetId('');
              }}
              className="h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateNewProject}
              disabled={!selectedPresetId}
              className="bg-cerrado-green1 hover:bg-cerrado-green2 h-9 text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;
