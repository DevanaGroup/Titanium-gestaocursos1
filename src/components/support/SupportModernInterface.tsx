import React, { useState, useEffect } from 'react';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Clock, 
  Zap,
  Headphones,
  CheckCircle,
  AlertTriangle,
  Activity,
  Timer,
  FileText,
  ArrowLeft,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  SupportTicket, 
  SupportTicketFilter
} from '@/types/support';
import { supportTicketService } from '@/services/supportTicketService';
import { SupportTicketForm } from './SupportTicketForm';
import { TicketRealTimeChat } from './TicketRealTimeChat';

export const SupportModernInterface: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatTicket, setChatTicket] = useState<SupportTicket | null>(null);

  // useEffect para gerenciar autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        loadTickets();
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Carregar tickets do usuário
  const loadTickets = async () => {
    try {
      setLoading(true);
      
      if (!auth.currentUser?.uid) return;

      const filters: SupportTicketFilter = {};
      const result = await supportTicketService.getTickets(filters);
      
      // Filtrar apenas tickets do usuário atual
      const userTickets = result.tickets.filter(ticket => 
        ticket.requesterId === auth.currentUser?.uid
      );
      
      setTickets(userTickets);

    } catch (error) {
      console.error('❌ Erro ao carregar tickets:', error);
      toast.error('Erro ao carregar tickets de suporte');
    } finally {
      setLoading(false);
    }
  };

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

  const activeTickets = tickets.filter(t => !['Resolvido', 'Fechado', 'Cancelado'].includes(t.status));
  const resolvedTickets = tickets.filter(t => ['Resolvido', 'Fechado'].includes(t.status));

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
      <div className="max-w-6xl mx-auto p-6">
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
                  Voltar ao Suporte
                </Button>
                <div>
                  <CardTitle className="text-xl">Chat - #{chatTicket.protocol}</CardTitle>
                  <p className="text-muted-foreground">{chatTicket.title}</p>
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Moderno */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
            <Headphones className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Central de Suporte
            </h1>
            <p className="text-muted-foreground">Chat instantâneo com nossa equipe de TI</p>
          </div>
        </div>
      </div>

      {/* Cards de Ação Principal */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Novo Chamado */}
        <Card className="relative overflow-hidden border-2 border-dashed border-blue-200 hover:border-blue-400 transition-all duration-300 group cursor-pointer"
              onClick={() => setShowCreateForm(true)}>
          <CardContent className="p-8 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Novo Chamado</h3>
              <p className="text-muted-foreground">Abra um ticket de suporte técnico</p>
              <Button className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Abrir Chamado
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chat Rápido */}
        <Card className="relative overflow-hidden border-2 border-green-200 hover:border-green-400 transition-all duration-300 group">
          <CardContent className="p-8 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Chat Instantâneo</h3>
              <p className="text-muted-foreground">Fale diretamente com nossa equipe</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">Suporte Online</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Activity className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{activeTickets.length}</div>
                <div className="text-sm text-muted-foreground">Tickets Ativos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{resolvedTickets.length}</div>
                <div className="text-sm text-muted-foreground">Resolvidos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">&lt; 2h</div>
                <div className="text-sm text-muted-foreground">Tempo Resposta</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Tickets Atual */}
      {tickets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Seus Tickets</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredTickets.slice(0, 5).map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
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
                      </div>
                      
                      <h3 className="font-medium text-sm mb-1">{ticket.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(ticket.createdAt)}
                        </div>
                        <span>{getTimeSince(ticket.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleChatClick(ticket)}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Chat
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredTickets.length > 5 && (
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    E mais {filteredTickets.length - 5} tickets...
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
      )}

      {/* Estado Vazio */}
      {tickets.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum ticket ainda</h3>
            <p className="text-muted-foreground mb-6">
              Que ótimo! Você ainda não precisou do nosso suporte.
            </p>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Primeiro Chamado
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal de Criação */}
      <SupportTicketForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSuccess={loadTickets}
      />
    </div>
  );
}; 