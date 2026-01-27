import React, { useState, useEffect } from 'react';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';
import { 
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  MoreVertical,
  Edit,
  UserPlus,
  MessageSquare,
  Calendar,
  FileText,
  Image as ImageIcon,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  SupportTicket, 
  SupportTicketFilter,
  SupportMetrics,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUS
} from '@/types/support';
import { supportTicketService } from '@/services/supportTicketService';
import { TicketDetailsModal } from './TicketDetailsModal';
import { SupportAnalytics } from './SupportAnalytics';
import { SupportReports } from './SupportReports';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  hierarchyLevel: string;
}

export const SupportAdminDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<string>('dashboard');
  
  // Filtros administrativos
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [assignedFilter, setAssignedFilter] = useState<string>('');
  const [requesterFilter, setRequesterFilter] = useState<string>('');

  // Estados para ações
  const [newStatus, setNewStatus] = useState<string>('');
  const [newPriority, setNewPriority] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');

  // useEffect para gerenciar autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Buscar dados do usuário para verificar permissões
        try {
          const userDoc = await getDoc(doc(db, 'collaborators_unified', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.hierarchyLevel || '');
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        }
      } else {
        setCurrentUser(null);
        setUserRole('');
      }
    });

    return () => unsubscribe();
  }, []);

  // Verificar se é admin
  const isAdmin = ['Diretor de TI', 'Presidente'].includes(userRole);

  // Carregar dados iniciais
  useEffect(() => {
    if (currentUser && isAdmin) {
      loadData();
    }
  }, [currentUser, isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTickets(),
        loadCollaborators(),
        loadMetrics()
      ]);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados administrativos');
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
      const filters: SupportTicketFilter = {};
      
      // Aplicar filtros da interface
      if (statusFilter && statusFilter !== 'all') filters.status = statusFilter as any;
      if (categoryFilter && categoryFilter !== 'all') filters.category = categoryFilter as any;
      if (priorityFilter && priorityFilter !== 'all') filters.priority = priorityFilter as any;
      if (assignedFilter && assignedFilter !== 'all') filters.assignedTo = assignedFilter;
      if (requesterFilter && requesterFilter !== 'all') filters.requesterId = requesterFilter;
      if (searchTerm) filters.searchTerm = searchTerm;

      const result = await supportTicketService.getTickets(filters, 100); // Mais tickets para admin
      setTickets(result.tickets);
    } catch (error) {
      console.error('❌ Erro ao carregar tickets:', error);
      throw error;
    }
  };

  const loadCollaborators = async () => {
    try {
      const collaboratorsSnapshot = await getDocs(collection(db, 'collaborators_unified'));
      const collaboratorsList: Collaborator[] = [];
      
      collaboratorsSnapshot.forEach((doc) => {
        const data = doc.data();
        collaboratorsList.push({
          id: doc.id,
          name: data.name || data.displayName || 'Sem nome',
          email: data.email || '',
          hierarchyLevel: data.hierarchyLevel || ''
        });
      });
      
      setCollaborators(collaboratorsList);
    } catch (error) {
      console.error('❌ Erro ao carregar colaboradores:', error);
      throw error;
    }
  };

  const loadMetrics = async () => {
    try {
      const metricsData = await supportTicketService.getMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('❌ Erro ao carregar métricas:', error);
      throw error;
    }
  };

  // Ações administrativas
  const handleAssignTicket = async (ticketId: string, collaboratorId: string) => {
    try {
      const collaborator = collaborators.find(c => c.id === collaboratorId);
      if (!collaborator) return;

      await supportTicketService.updateTicket(ticketId, {
        assignedTo: collaboratorId,
        assignedToName: collaborator.name,
        assignedAt: new Date()
      });

      toast.success(`Ticket atribuído para ${collaborator.name}`);
      loadTickets();
    } catch (error) {
      console.error('❌ Erro ao atribuir ticket:', error);
      toast.error('Erro ao atribuir ticket');
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'Resolvido') {
        updateData.resolvedAt = new Date();
      } else if (newStatus === 'Fechado') {
        updateData.closedAt = new Date();
      }

      await supportTicketService.updateTicket(ticketId, updateData);
      toast.success(`Status alterado para: ${newStatus}`);
      loadTickets();
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      await supportTicketService.updateTicket(ticketId, { priority: newPriority as any });
      toast.success(`Prioridade alterada para: ${newPriority}`);
      loadTickets();
    } catch (error) {
      console.error('❌ Erro ao alterar prioridade:', error);
      toast.error('Erro ao alterar prioridade');
    }
  };

  // Ações em massa
  const handleBulkAssign = async () => {
    try {
      if (selectedTickets.size === 0 || !assignedTo) return;

      const collaborator = collaborators.find(c => c.id === assignedTo);
      if (!collaborator) return;

      for (const ticketId of selectedTickets) {
        await supportTicketService.updateTicket(ticketId, {
          assignedTo: assignedTo,
          assignedToName: collaborator.name,
          assignedAt: new Date()
        });
      }

      toast.success(`${selectedTickets.size} ticket(s) atribuído(s) para ${collaborator.name}`);
      setSelectedTickets(new Set());
      setShowAssignDialog(false);
      loadTickets();
    } catch (error) {
      console.error('❌ Erro na atribuição em massa:', error);
      toast.error('Erro na atribuição em massa');
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      if (selectedTickets.size === 0) return;

      for (const ticketId of selectedTickets) {
        await handleStatusChange(ticketId, status);
      }

      setSelectedTickets(new Set());
    } catch (error) {
      console.error('❌ Erro na alteração em massa:', error);
      toast.error('Erro na alteração em massa');
    }
  };

  // Utilitários
  const toggleTicketSelection = (ticketId: string) => {
    const newSelection = new Set(selectedTickets);
    if (newSelection.has(ticketId)) {
      newSelection.delete(ticketId);
    } else {
      newSelection.add(ticketId);
    }
    setSelectedTickets(newSelection);
  };

  const selectAllTickets = () => {
    setSelectedTickets(new Set(tickets.map(t => t.id)));
  };

  const clearSelection = () => {
    setSelectedTickets(new Set());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aberto': return <AlertTriangle className="w-4 h-4" />;
      case 'Em Análise': return <Clock className="w-4 h-4" />;
      case 'Resolvido': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-red-100 text-red-800 border-red-200';
      case 'Em Análise': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Aguardando Usuário': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Em Desenvolvimento': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Em Teste': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Resolvido': return 'bg-green-100 text-green-800 border-green-200';
      case 'Fechado': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Cancelado': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgente': return 'bg-red-100 text-red-800 border-red-200';
      case 'Alta': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Média': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Baixa': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  // Verificar permissões
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
          <p className="text-muted-foreground">
            Apenas o Diretor de TI e Presidente têm acesso ao painel administrativo.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Carregando dados administrativos...</span>
        </div>
      </div>
    );
  }

  // Renderização condicional baseada na view ativa
  if (activeView === 'analytics') {
    return <SupportAnalytics />;
  }

  if (activeView === 'reports') {
    return <SupportReports />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo - Suporte</h1>
          <p className="text-muted-foreground">
            Gerencie todos os tickets de suporte da empresa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activeView} onValueChange={setActiveView}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
              <SelectItem value="reports">Relatórios</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalTickets}</div>
              <p className="text-xs text-muted-foreground">
                Todos os tickets criados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.openTickets}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando resolução
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Resolvidos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.resolvedTickets}</div>
              <p className="text-xs text-muted-foreground">
                Problemas solucionados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.averageResolutionTime.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">
                Para resolução
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros Administrativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros Administrativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Campo de busca à esquerda */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-3.5 h-3.5 z-10" />
              <Input
                placeholder="Buscar tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Botão de filtros à direita */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-9 px-3 gap-2 ${
                    statusFilter !== "all" || 
                    categoryFilter !== "all" || 
                    priorityFilter !== "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : ""
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filtros</span>
                  {(statusFilter !== "all" || 
                    categoryFilter !== "all" || 
                    priorityFilter !== "all") && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {[
                        statusFilter !== "all" ? 1 : 0,
                        categoryFilter !== "all" ? 1 : 0,
                        priorityFilter !== "all" ? 1 : 0,
                      ].reduce((a, b) => a + b, 0)}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Filtros</h4>
                    {(statusFilter !== "all" || 
                      categoryFilter !== "all" || 
                      priorityFilter !== "all") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStatusFilter("all");
                          setCategoryFilter("all");
                          setPriorityFilter("all");
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Filtro de Status */}
                    <div className="space-y-2">
                      <Label htmlFor="filter-status" className="text-xs font-medium">
                        Status
                      </Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger id="filter-status" className="h-9">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os status</SelectItem>
                          {SUPPORT_STATUS.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro de Categoria */}
                    <div className="space-y-2">
                      <Label htmlFor="filter-category" className="text-xs font-medium">
                        Categoria
                      </Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger id="filter-category" className="h-9">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {SUPPORT_CATEGORIES.map(category => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro de Prioridade */}
                    <div className="space-y-2">
                      <Label htmlFor="filter-priority" className="text-xs font-medium">
                        Prioridade
                      </Label>
                      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger id="filter-priority" className="h-9">
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {SUPPORT_PRIORITIES.map(priority => (
                            <SelectItem key={priority.value} value={priority.value}>
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Atribuído para" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unassigned">Não atribuídos</SelectItem>
                {collaborators.map(collaborator => (
                  <SelectItem key={collaborator.id} value={collaborator.id}>
                    {collaborator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={requesterFilter} onValueChange={setRequesterFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Solicitante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {collaborators.map(collaborator => (
                  <SelectItem key={collaborator.id} value={collaborator.id}>
                    {collaborator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ações em Massa */}
      {selectedTickets.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium">{selectedTickets.size} ticket(s) selecionado(s)</span>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Limpar seleção
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAssignDialog(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Atribuir
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Alterar Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {SUPPORT_STATUS.map(status => (
                      <DropdownMenuItem 
                        key={status}
                        onClick={() => handleBulkStatusChange(status)}
                      >
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Tickets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Tickets ({tickets.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectedTickets.size === tickets.length ? clearSelection : selectAllTickets}
              >
                {selectedTickets.size === tickets.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum ticket encontrado</h3>
                <p className="text-muted-foreground">
                  Nenhum ticket corresponde aos filtros aplicados.
                </p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedTickets.has(ticket.id)}
                      onCheckedChange={() => toggleTicketSelection(ticket.id)}
                      className="mt-1"
                    />

                    {/* Conteúdo Principal */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              {ticket.protocol}
                            </span>
                            <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                            <Badge className={getStatusColor(ticket.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(ticket.status)}
                                <span>{ticket.status}</span>
                              </div>
                            </Badge>
                          </div>
                          <h3 className="font-semibold">{ticket.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                        </div>

                        {/* Menu de ações */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setShowTicketDetails(true);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Atribuir para:</DropdownMenuLabel>
                            {collaborators.slice(0, 5).map(collaborator => (
                              <DropdownMenuItem
                                key={collaborator.id}
                                onClick={() => handleAssignTicket(ticket.id, collaborator.id)}
                              >
                                <Users className="w-4 h-4 mr-2" />
                                {collaborator.name}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Alterar Status:</DropdownMenuLabel>
                            {SUPPORT_STATUS.slice(0, 4).map(status => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() => handleStatusChange(ticket.id, status)}
                              >
                                {getStatusIcon(status)}
                                <span className="ml-2">{status}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Metadados */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>Por: {ticket.requesterName}</span>
                        </div>
                        {ticket.assignedToName && (
                          <div className="flex items-center gap-1">
                            <UserPlus className="w-4 h-4" />
                            <span>Atribuído: {ticket.assignedToName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(ticket.createdAt)}</span>
                        </div>
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{ticket.attachments.length} anexo(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Atribuição em Massa */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Tickets em Massa</DialogTitle>
            <DialogDescription>
              Selecione um colaborador para atribuir {selectedTickets.size} ticket(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um colaborador" />
              </SelectTrigger>
              <SelectContent>
                {collaborators.map(collaborator => (
                  <SelectItem key={collaborator.id} value={collaborator.id}>
                    {collaborator.name} - {collaborator.hierarchyLevel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleBulkAssign} disabled={!assignedTo}>
                Atribuir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes com Comunicação */}
      <TicketDetailsModal
        ticket={selectedTicket}
        open={showTicketDetails}
        onOpenChange={setShowTicketDetails}
        onTicketUpdated={loadTickets}
      />
    </div>
  );
};
