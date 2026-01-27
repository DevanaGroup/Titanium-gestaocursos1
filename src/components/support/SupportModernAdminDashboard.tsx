import React, { useState, useEffect } from 'react';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { 
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
  FileText,
  Activity,
  Timer,
  Zap,
  TrendingUp,
  Eye,
  Trash2,
  ArrowLeft,
  X
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
import { TicketRealTimeChat } from './TicketRealTimeChat';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  hierarchyLevel: string;
}

export const SupportModernAdminDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatTicket, setChatTicket] = useState<SupportTicket | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // useEffect para gerenciar autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
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

  // Carregar dados
  const loadData = async () => {
    await Promise.all([
      loadTickets(),
      loadCollaborators(),
      loadMetrics()
    ]);
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const filters: SupportTicketFilter = {};
      
      // Aplicar filtros da interface
      if (statusFilter && statusFilter !== 'all' && statusFilter !== '') filters.status = [statusFilter as any];
      if (categoryFilter && categoryFilter !== 'all' && categoryFilter !== '') filters.category = [categoryFilter as any];
      if (priorityFilter && priorityFilter !== 'all' && priorityFilter !== '') filters.priority = [priorityFilter as any];

      const result = await supportTicketService.getTickets(filters);
      setTickets(result.tickets);

    } catch (error) {
      console.error('❌ Erro ao carregar tickets:', error);
      toast.error('Erro ao carregar tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadCollaborators = async () => {
    try {
      const collaboratorsQuery = query(collection(db, 'collaborators_unified'));
      const collaboratorsSnapshot = await getDocs(collaboratorsQuery);
      
      const collaboratorsData: Collaborator[] = [];
      collaboratorsSnapshot.forEach((doc) => {
        const data = doc.data();
        collaboratorsData.push({
          id: doc.id,
          name: data.name || data.displayName || 'Sem nome',
          email: data.email || '',
          hierarchyLevel: data.hierarchyLevel || 'Não definido'
        });
      });
      
      setCollaborators(collaboratorsData);
    } catch (error) {
      console.error('❌ Erro ao carregar colaboradores:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const metricsData = await supportTicketService.getMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('❌ Erro ao carregar métricas:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, statusFilter, categoryFilter, priorityFilter]);

  // Filtrar tickets pelo termo de busca
  const filteredTickets = tickets.filter(ticket => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      ticket.title.toLowerCase().includes(searchLower) ||
      ticket.description.toLowerCase().includes(searchLower) ||
      ticket.protocol.toLowerCase().includes(searchLower) ||
      ticket.requesterName.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-red-50 text-red-700 border-red-200';
      case 'Em Análise': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Em Desenvolvimento': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Resolvido': return 'bg-green-50 text-green-700 border-green-200';
      case 'Fechado': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aberto': return <AlertTriangle className="w-4 h-4" />;
      case 'Em Análise': return <Activity className="w-4 h-4" />;
      case 'Em Desenvolvimento': return <Timer className="w-4 h-4" />;
      case 'Resolvido': return <CheckCircle className="w-4 h-4" />;
      case 'Fechado': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgente': return 'bg-red-500';
      case 'Alta': return 'bg-orange-500';
      case 'Média': return 'bg-yellow-500';
      case 'Baixa': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleChatClick = (ticket: SupportTicket) => {
    setChatTicket(ticket);
    setShowChat(true);
  };

  const handleExitChat = () => {
    setShowChat(false);
    setChatTicket(null);
  };

  const handleTicketClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowTicketDetails(true);
  };

  const handleDeleteTicket = async (ticketId: string, ticketProtocol: string) => {
    // Verificar se tem permissão para excluir
    if (!['Diretor de TI', 'Presidente'].includes(userRole)) {
      toast.error('Apenas o Diretor de TI e Presidente podem excluir tickets');
      return;
    }

    // Confirmar exclusão
    if (!confirm(`Tem certeza que deseja excluir o ticket #${ticketProtocol}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await supportTicketService.deleteTicket(ticketId);
      toast.success('Ticket excluído com sucesso');
      loadData(); // Recarregar dados
    } catch (error) {
      console.error('❌ Erro ao excluir ticket:', error);
      toast.error('Erro ao excluir ticket');
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM HH:mm', { locale: ptBR });
  };

  const getTimeSince = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora';
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  };

  // Verificar permissões
  const isAdmin = ['Diretor de TI', 'Presidente'].includes(userRole);
  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se o chat está ativo, mostrar apenas o chat
  if (showChat && chatTicket) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        {/* Header do Chat */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExitChat}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Painel
                </Button>
                <div>
                  <CardTitle className="text-xl">Chat Administrativo - #{chatTicket.protocol}</CardTitle>
                  <p className="text-muted-foreground">{chatTicket.title}</p>
                  <p className="text-sm text-muted-foreground">Solicitante: {chatTicket.requesterName}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExitChat}
                className="text-muted-foreground hover:text-red-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Chat Component */}
        <Card className="h-[calc(100vh-250px)]">
          <CardContent className="p-0 h-full">
            <TicketRealTimeChat
              ticket={chatTicket}
              open={true}
              onOpenChange={() => {}}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const openTickets = tickets.filter(t => !['Resolvido', 'Fechado', 'Cancelado'].includes(t.status));
  const urgentTickets = tickets.filter(t => t.priority === 'Urgente' && !['Resolvido', 'Fechado'].includes(t.status));
  const unassignedTickets = tickets.filter(t => !t.assignedTo && !['Resolvido', 'Fechado'].includes(t.status));

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Métricas Visuais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tickets Abertos</p>
                <p className="text-3xl font-bold text-red-600">{openTickets.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Necessitam atenção</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Urgentes</p>
                <p className="text-3xl font-bold text-orange-600">{urgentTickets.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Prioridade máxima</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Não Atribuídos</p>
                <p className="text-3xl font-bold text-yellow-600">{unassignedTickets.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Aguardando atribuição</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <UserPlus className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Resolução</p>
                <p className="text-3xl font-bold text-green-600">
                  {metrics ? Math.round((metrics.resolvedTickets / metrics.totalTickets) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Problemas resolvidos</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Campo de busca à esquerda */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-3.5 h-3.5 z-10" />
              <Input
                placeholder="Buscar por título, protocolo ou solicitante..."
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
                          <SelectItem value="all">Todas as categorias</SelectItem>
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
                          <SelectItem value="all">Todas as prioridades</SelectItem>
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

      {/* Lista de Tickets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Tickets ({filteredTickets.length})
          </h2>
        </div>

        <div className="space-y-3">
          {filteredTickets.slice(0, 10).map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className={getStatusColor(ticket.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(ticket.status)}
                          <span className="text-xs">{ticket.status}</span>
                        </div>
                      </Badge>
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(ticket.priority)}`}></div>
                      <span className="text-xs text-muted-foreground">#{ticket.protocol}</span>
                      <span className="text-xs text-muted-foreground">{ticket.category}</span>
                    </div>
                    
                    <h3 className="font-medium text-sm mb-1">{ticket.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{ticket.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {ticket.requesterName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(ticket.createdAt)}
                      </div>
                      <span>{getTimeSince(ticket.createdAt)}</span>
                      {ticket.assignedToName && (
                        <div className="flex items-center gap-1">
                          <UserPlus className="w-3 h-3" />
                          Atribuído: {ticket.assignedToName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleChatClick(ticket)}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Chat
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleTicketClick(ticket)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Detalhes
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar Status
                        </DropdownMenuItem>
                        {['Diretor de TI', 'Presidente'].includes(userRole) && (
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTicket(ticket.id, ticket.protocol)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredTickets.length > 10 && (
            <Card className="border-dashed">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  E mais {filteredTickets.length - 10} tickets...
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Todos
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Ticket */}
      <TicketDetailsModal
        ticket={selectedTicket}
        open={showTicketDetails}
        onOpenChange={setShowTicketDetails}
        onTicketUpdated={loadData}
      />
    </div>
  );
}; 