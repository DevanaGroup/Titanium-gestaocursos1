import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Users,
  Search,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { auth } from '@/config/firebase';
import {
  getUserAgendaForMonth,
  createAgendaEvent,
  updateAgendaEvent,
  deleteAgendaEvent,
  getUserAgendaStats
} from '@/services/agendaService';
import { createSampleAgendaEvents } from '@/utils/agendaSeeder';
import {
  AgendaEvent,
  AgendaEventType,
  AgendaEventStatus,
  TaskPriority,
  HierarchyLevel
} from '@/types';
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

interface AgendaComponentProps {
  userId?: string;
  userName?: string;
}

export const AgendaComponent: React.FC<AgendaComponentProps> = ({ 
  userId: propUserId, 
  userName: propUserName 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AgendaEventType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AgendaEventStatus | 'all'>('all');
  
  // Estados para confirmação de exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Dados do usuário atual
  const currentUser = auth.currentUser;
  const userId = propUserId || currentUser?.uid || '';
  const userName = propUserName || currentUser?.displayName || 'Usuário';

  const queryClient = useQueryClient();

  // Buscar eventos do mês atual
  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['agendaEvents', userId, currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: () => getUserAgendaForMonth(userId, currentDate.getFullYear(), currentDate.getMonth() + 1),
    enabled: !!userId,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ['agendaStats', userId],
    queryFn: () => getUserAgendaStats(userId),
    enabled: !!userId,
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  // Mutação para criar evento
  const createEventMutation = useMutation({
    mutationFn: createAgendaEvent,
    onSuccess: () => {
      toast.success('Evento criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['agendaEvents'] });
      queryClient.invalidateQueries({ queryKey: ['agendaStats'] });
      setIsCreateEventOpen(false);
    },
    onError: (error) => {
      toast.error('Erro ao criar evento');
      console.error(error);
    },
  });

  // Mutação para atualizar evento
  const updateEventMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AgendaEvent> }) =>
      updateAgendaEvent(id, updates),
    onSuccess: () => {
      toast.success('Evento atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['agendaEvents'] });
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar evento');
      console.error(error);
    },
  });

  // Mutação para excluir evento
  const deleteEventMutation = useMutation({
    mutationFn: deleteAgendaEvent,
    onSuccess: () => {
      toast.success('Evento excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['agendaEvents'] });
      queryClient.invalidateQueries({ queryKey: ['agendaStats'] });
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
      setDeleteConfirmOpen(false);
      setEventToDelete(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir evento');
      console.error(error);
    },
  });

  // Função para confirmar exclusão
  const handleDeleteConfirm = (eventId: string) => {
    setEventToDelete(eventId);
    setDeleteConfirmOpen(true);
  };

  // Função para executar exclusão
  const executeDelete = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate(eventToDelete);
    }
  };

  // Filtrar eventos
  const filteredEvents = events?.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  // Obter eventos para uma data específica
  const getEventsForDate = (date: Date): AgendaEvent[] => {
    return filteredEvents.filter(event => isSameDay(event.startDate, date));
  };

  // Renderizar badge de prioridade
  const renderPriorityBadge = (priority: TaskPriority) => {
    const colors = {
      [TaskPriority.Baixa]: 'bg-green-100 text-green-800',
      [TaskPriority.Média]: 'bg-yellow-100 text-yellow-800',
      [TaskPriority.Alta]: 'bg-orange-100 text-orange-800',
      [TaskPriority.Urgente]: 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={colors[priority]}>
        {priority}
      </Badge>
    );
  };

  // Renderizar badge de status
  const renderStatusBadge = (status: AgendaEventStatus) => {
    const colors = {
      [AgendaEventStatus.Agendado]: 'bg-blue-100 text-blue-800',
      [AgendaEventStatus.Confirmado]: 'bg-green-100 text-green-800',
      [AgendaEventStatus.EmAndamento]: 'bg-yellow-100 text-yellow-800',
      [AgendaEventStatus.Concluido]: 'bg-gray-100 text-gray-800',
      [AgendaEventStatus.Cancelado]: 'bg-red-100 text-red-800',
      [AgendaEventStatus.Reagendado]: 'bg-purple-100 text-purple-800',
    };
    
    return (
      <Badge className={colors[status]}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-40 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Próximos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
          </CardContent>
        </Card>
      </div>

      {/* Controles e filtros */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Agenda - {format(currentDate, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
              <CardDescription>Gerencie seus eventos e compromissos</CardDescription>
            </div>
            <Button onClick={() => setIsCreateEventOpen(true)} className="bg-red-500 hover:bg-red-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar eventos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={(value) => setFilterType(value as AgendaEventType | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.values(AgendaEventType).map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as AgendaEventStatus | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.values(AgendaEventStatus).map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Layout principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
              {/* Calendário */}
              <div className="lg:col-span-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  onMonthChange={setCurrentDate}
                  className="rounded-md border w-full scale-90 origin-top-left"
                  locale={ptBR}
                  modifiers={{
                    hasEvents: (date) => getEventsForDate(date).length > 0
                  }}
                  modifiersStyles={{
                    hasEvents: { backgroundColor: '#dbeafe', fontWeight: 'bold' }
                  }}
                />
              </div>

              {/* Lista de eventos */}
              <div className="lg:col-span-1">
                <div className="h-full flex flex-col">
                  <h3 className="text-lg font-semibold mb-4">
                    {selectedDate ? 
                      `Eventos para ${format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}` : 
                      'Todos os eventos'
                    }
                  </h3>
                  
                  {filteredEvents.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                      <div>
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum evento agendado para esta data.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 min-h-0">
                      {(selectedDate ? getEventsForDate(selectedDate) : filteredEvents).map((event) => (
                        <Card 
                          key={event.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            setSelectedEvent(event);
                            setIsEventDialogOpen(true);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold">{event.title}</h4>
                                  {renderStatusBadge(event.status)}
                                  {renderPriorityBadge(event.priority)}
                                </div>
                                
                                <div className="text-sm text-muted-foreground space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    {format(event.startDate, 'HH:mm', { locale: ptBR })} - {format(event.endDate, 'HH:mm', { locale: ptBR })}
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      {event.location}
                                    </div>
                                  )}
                                  {event.clientName && (
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      {event.clientName}
                                    </div>
                                  )}
                                </div>
                                
                                {event.description && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              
                              <Badge variant="outline" className="ml-2">
                                {event.type}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogos */}
      <CreateEventDialog
        open={isCreateEventOpen}
        onOpenChange={setIsCreateEventOpen}
        onSubmit={(eventData) => createEventMutation.mutate(eventData)}
        initialDate={selectedDate}
        userId={userId}
        userName={userName}
      />

      <EventDetailsDialog
        event={selectedEvent}
        open={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        onUpdate={(updates) => selectedEvent && updateEventMutation.mutate({ id: selectedEvent.id, updates })}
        onDelete={handleDeleteConfirm}
      />

      {/* Diálogo de confirmação de exclusão */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={executeDelete}
        title="Excluir Evento"
        description="Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  );
};

// Componente para criar evento
interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (eventData: Omit<AgendaEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialDate?: Date;
  userId: string;
  userName: string;
}

const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialDate,
  userId,
  userName,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: AgendaEventType.Compromisso,
    status: AgendaEventStatus.Agendado,
    startDate: initialDate || new Date(),
    endDate: initialDate || new Date(),
    allDay: false,
    location: '',
    priority: TaskPriority.Média,
    notifyAllCollaborators: false,
    notifyByHierarchy: [] as string[],
    customParticipants: [] as string[]
  });

  const [selectedHierarchies, setSelectedHierarchies] = useState<string[]>([]);
  const [availableHierarchies] = useState<string[]>([
    "Presidente",
    "Diretor", 
    "Diretor de TI",
    "Gerente",
    "Coordenador", 
    "Supervisor",
    "Líder Técnico",
    "Engenheiro",
    "Analista",
    "Financeiro", 
    "Técnico/Assistente",
    "Estagiário/Auxiliar"
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    const eventData: Omit<AgendaEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      ...formData,
      ownerId: userId,
      ownerName: userName,
      createdBy: userId,
      createdByName: userName,
      notifyAllCollaborators: formData.notifyAllCollaborators,
      notifyByHierarchy: selectedHierarchies,
      customParticipants: formData.customParticipants
    };

    onSubmit(eventData);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      type: AgendaEventType.Compromisso,
      status: AgendaEventStatus.Agendado,
      startDate: initialDate || new Date(),
      endDate: initialDate || new Date(),
      allDay: false,
      location: '',
      priority: TaskPriority.Média,
      notifyAllCollaborators: false,
      notifyByHierarchy: [],
      customParticipants: []
    });
    setSelectedHierarchies([]);
  };

  const handleHierarchyChange = (hierarchy: string, checked: boolean) => {
    if (checked) {
      setSelectedHierarchies(prev => [...prev, hierarchy]);
    } else {
      setSelectedHierarchies(prev => prev.filter(h => h !== hierarchy));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Evento</DialogTitle>
          <DialogDescription>
            Preencha os dados do seu novo compromisso e selecione quem deve ser notificado.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações básicas do evento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Informações do Evento
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Reunião com cliente"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes do evento..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as AgendaEventType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AgendaEventType).map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskPriority).map(priority => (
                      <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="location">Local</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Escritório, Online, Cliente..."
                />
              </div>

              <div>
                <Label htmlFor="startDate">Data/Hora Início</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={format(formData.startDate, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="endDate">Data/Hora Fim</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={format(formData.endDate, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Configurações de notificação */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Quem deve ser notificado?
            </h3>
            
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              {/* Opção: Todos os colaboradores */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyAll"
                  checked={formData.notifyAllCollaborators}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, notifyAllCollaborators: checked as boolean })
                  }
                />
                <Label htmlFor="notifyAll" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Notificar TODOS os colaboradores
                </Label>
              </div>

              {/* Opção: Por cargo/hierarquia */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ou notificar por cargo:</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {availableHierarchies.map(hierarchy => (
                    <div key={hierarchy} className="flex items-center space-x-2">
                      <Checkbox
                        id={`hierarchy-${hierarchy}`}
                        checked={selectedHierarchies.includes(hierarchy)}
                        onCheckedChange={(checked) => 
                          handleHierarchyChange(hierarchy, checked as boolean)
                        }
                        disabled={formData.notifyAllCollaborators}
                      />
                      <Label 
                        htmlFor={`hierarchy-${hierarchy}`} 
                        className={`text-sm ${formData.notifyAllCollaborators ? 'text-gray-400' : ''}`}
                      >
                        {hierarchy}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aviso sobre notificações */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Como funcionam as notificações:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• <strong>Organizador</strong>: Sempre será notificado</li>
                    <li>• <strong>Prioridade Urgente</strong>: 24h, 4h, 1h, 30min antes</li>
                    <li>• <strong>Prioridade Alta</strong>: 24h, 2h, 30min antes</li>
                    <li>• <strong>Prioridade Média</strong>: 24h, 1h antes</li>
                    <li>• <strong>Prioridade Baixa</strong>: 24h antes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Criar Evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Componente para detalhes do evento
interface EventDetailsDialogProps {
  event: AgendaEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<AgendaEvent>) => void;
  onDelete: (eventId: string) => void;
}

const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({
  event,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<AgendaEvent>>({});

  useEffect(() => {
    if (event) {
      setEditData(event);
    }
  }, [event]);

  if (!event) return null;

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(event.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {isEditing ? 'Editar Evento' : event.title}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={editData.title || ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select 
                    value={editData.type} 
                    onValueChange={(value) => setEditData({ ...editData, type: value as AgendaEventType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AgendaEventType).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select 
                    value={editData.status} 
                    onValueChange={(value) => setEditData({ ...editData, status: value as AgendaEventStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AgendaEventStatus).map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Local</Label>
                <Input
                  value={editData.location || ''}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{event.type}</Badge>
                <Badge className={
                  event.status === AgendaEventStatus.Concluido ? 'bg-green-100 text-green-800' :
                  event.status === AgendaEventStatus.Cancelado ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }>
                  {event.status}
                </Badge>
                <Badge className={
                  event.priority === TaskPriority.Urgente ? 'bg-red-100 text-red-800' :
                  event.priority === TaskPriority.Alta ? 'bg-orange-100 text-orange-800' :
                  event.priority === TaskPriority.Média ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }>
                  {event.priority}
                </Badge>
              </div>

              {event.description && (
                <div>
                  <Label>Descrição</Label>
                  <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data/Hora Início</Label>
                  <p className="text-sm">
                    {format(event.startDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label>Data/Hora Fim</Label>
                  <p className="text-sm">
                    {format(event.endDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>

              {event.location && (
                <div>
                  <Label>Local</Label>
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                </div>
              )}

              {event.clientName && (
                <div>
                  <Label>Cliente</Label>
                  <p className="text-sm text-muted-foreground">{event.clientName}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar Alterações
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgendaComponent; 