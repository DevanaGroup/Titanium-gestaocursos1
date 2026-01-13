import React, { useState, useEffect } from 'react';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Eye,
  FileText,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  SupportTicket, 
  SupportTicketFilter,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES
} from '@/types/support';
import { supportTicketService } from '@/services/supportTicketService';
import { SupportTicketForm } from './SupportTicketForm';
import { TicketDetailsModal } from './TicketDetailsModal';
import { TicketRealTimeChat } from './TicketRealTimeChat';

export const SupportTicketsPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatTicket, setChatTicket] = useState<SupportTicket | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // useEffect para gerenciar autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Buscar dados do usuário para obter o role
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

  // Carregar tickets do usuário
  const loadTickets = async () => {
    try {
      setLoading(true);
      
      if (!currentUser?.uid) return;

      const filters: SupportTicketFilter = {};
      
      // Filtrar por usuário (exceto diretor de TI e presidente)
      if (!['Diretor de TI', 'Presidente'].includes(userRole)) {
        // Removemos a referência ao userId que não existe na interface
        // O serviço deve filtrar internamente por usuário
      }

      // Aplicar filtros da interface
      if (statusFilter && statusFilter !== 'all') filters.status = statusFilter as any;
      if (categoryFilter && categoryFilter !== 'all') filters.category = categoryFilter as any;
      if (priorityFilter && priorityFilter !== 'all') filters.priority = priorityFilter as any;

      const result = await supportTicketService.getTickets(filters);
      setTickets(result.tickets);

    } catch (error) {
      console.error('❌ Erro ao carregar tickets:', error);
      toast.error('Erro ao carregar tickets de suporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [currentUser, statusFilter, categoryFilter, priorityFilter]);

  // Filtrar tickets pelo termo de busca
  const filteredTickets = tickets.filter(ticket => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      ticket.title.toLowerCase().includes(searchLower) ||
      ticket.description.toLowerCase().includes(searchLower) ||
      ticket.protocol.toLowerCase().includes(searchLower)
    );
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aberto': return <AlertCircle className="w-4 h-4" />;
      case 'Em Análise': return <Clock className="w-4 h-4" />;
      case 'Aguardando Usuário': return <MessageCircle className="w-4 h-4" />;
      case 'Em Desenvolvimento': return <Clock className="w-4 h-4" />;
      case 'Em Teste': return <Clock className="w-4 h-4" />;
      case 'Resolvido': return <CheckCircle className="w-4 h-4" />;
      case 'Fechado': return <CheckCircle className="w-4 h-4" />;
      case 'Cancelado': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
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

  const getCategoryInfo = (category: string) => {
    return SUPPORT_CATEGORIES.find(cat => cat.value === category);
  };

  const handleTicketClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowTicketDetails(true);
  };

  const handleChatClick = (ticket: SupportTicket, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que abra os detalhes
    setChatTicket(ticket);
    setShowChat(true);
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getTimeSinceCreation = (createdAt: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 dia atrás';
    if (diffInDays < 7) return `${diffInDays} dias atrás`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks === 1) return '1 semana atrás';
    return `${diffInWeeks} semanas atrás`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Suporte Web</h1>
          <p className="text-muted-foreground">
            Gerencie tickets de suporte técnico do sistema
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Ticket
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, descrição ou protocolo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Aberto">Aberto</SelectItem>
                <SelectItem value="Em Análise">Em Análise</SelectItem>
                <SelectItem value="Aguardando Usuário">Aguardando Usuário</SelectItem>
                <SelectItem value="Em Desenvolvimento">Em Desenvolvimento</SelectItem>
                <SelectItem value="Em Teste">Em Teste</SelectItem>
                <SelectItem value="Resolvido">Resolvido</SelectItem>
                <SelectItem value="Fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
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

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as prioridades" />
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
        </CardContent>
      </Card>

      {/* Lista de Tickets */}
      <div className="grid gap-4">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum ticket encontrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || (statusFilter && statusFilter !== 'all') || (categoryFilter && categoryFilter !== 'all') || (priorityFilter && priorityFilter !== 'all')
                  ? 'Nenhum ticket corresponde aos filtros aplicados.'
                  : 'Você ainda não possui tickets de suporte.'}
              </p>
              {!searchTerm && (!statusFilter || statusFilter === 'all') && (!categoryFilter || categoryFilter === 'all') && (!priorityFilter || priorityFilter === 'all') && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Ticket
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => {
            const categoryInfo = getCategoryInfo(ticket.category);
            return (
              <Card 
                key={ticket.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTicketClick(ticket)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    
                    {/* Informações Principais */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-muted-foreground">
                              {ticket.protocol}
                            </span>
                            <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg leading-tight mb-2">
                            {ticket.title}
                          </h3>
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {ticket.description}
                          </p>
                        </div>
                      </div>

                      {/* Metadados */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {categoryInfo?.icon}
                          <span>{ticket.category}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(ticket.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{getTimeSinceCreation(ticket.createdAt)}</span>
                        </div>
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{ticket.attachments.length} anexo(s)</span>
                          </div>
                        )}
                        {ticket.screenshots && ticket.screenshots.length > 0 && (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="w-4 h-4" />
                            <span>{ticket.screenshots.length} screenshot(s)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status e Ações */}
                    <div className="flex flex-col items-end gap-3">
                      <Badge className={getStatusColor(ticket.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(ticket.status)}
                          <span>{ticket.status}</span>
                        </div>
                      </Badge>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => handleChatClick(ticket, e)}
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Chat
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal de Criação */}
      <SupportTicketForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSuccess={loadTickets}
      />

      {/* Modal de Detalhes do Ticket com Comunicação */}
      <TicketDetailsModal
        ticket={selectedTicket}
        open={showTicketDetails}
        onOpenChange={setShowTicketDetails}
        onTicketUpdated={loadTickets}
      />

      {/* Chat em Tempo Real */}
      {chatTicket && (
        <TicketRealTimeChat
          ticket={chatTicket}
          open={showChat}
          onOpenChange={setShowChat}
        />
      )}
    </div>
  );
}; 