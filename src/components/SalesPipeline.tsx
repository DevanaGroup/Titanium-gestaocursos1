import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from '@hello-pangea/dnd';
import { 
  Phone, 
  Calendar, 
  DollarSign, 
  Building,
  User,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { auth, db } from '@/config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { Prospect } from '@/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SalesPipelineProps {
  userId: string;
  userName: string;
  userRole?: string;
}

const statusColumns = [
  { id: 'Cold', title: 'Cold', color: 'bg-blue-500' },
  { id: 'Warm', title: 'Warm', color: 'bg-yellow-500' },
  { id: 'Hot', title: 'Hot', color: 'bg-orange-500' },
  { id: 'Qualified', title: 'Qualified', color: 'bg-green-500' },
  { id: 'Proposal', title: 'Proposal', color: 'bg-purple-500' },
  { id: 'Negotiation', title: 'Negotiation', color: 'bg-indigo-500' },
  { id: 'Closed-Won', title: 'Fechado', color: 'bg-emerald-500' },
  { id: 'Closed-Lost', title: 'Perdido', color: 'bg-red-500' }
];

export const SalesPipeline: React.FC<SalesPipelineProps> = ({ 
  userId, 
  userName,
  userRole = 'Comercial'
}) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

  useEffect(() => {
    loadProspects();
  }, [userId]);

  const loadProspects = async () => {
    setIsLoading(true);
    try {
      // Diretor de TI e Diretor Comercial veem todos os prospects
      const canViewAllProspects = ['Diretor de TI', 'Diretor Comercial'].includes(userRole);
      
      let q;
      if (canViewAllProspects) {
        // Buscar todos os prospects
        q = query(collection(db, 'prospects'), orderBy('updatedAt', 'desc'));
      } else {
        // Buscar apenas prospects atribuídos ao usuário
        q = query(
          collection(db, 'prospects'),
          where('assignedTo', '==', userId),
          orderBy('updatedAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      const prospectsData = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastContactDate: data.lastContactDate?.toDate(),
          nextContactDate: data.nextContactDate?.toDate(),
        };
      }) as Prospect[];
      
      setProspects(prospectsData);
    } catch (error) {
      console.error('Erro ao carregar prospects:', error);
      toast.error('Erro ao carregar prospects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const prospectId = draggableId;
    const newStatus = destination.droppableId as Prospect['status'];

    try {
      await updateDoc(doc(db, 'prospects', prospectId), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      // Atualizar estado local
      setProspects(prev => prev.map(prospect => 
        prospect.id === prospectId 
          ? { ...prospect, status: newStatus }
          : prospect
      ));

      toast.success('Status do prospect atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Abre WhatsApp com o telefone do prospect
  const normalizePhoneForWhatsApp = (phone: string): string => {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits) return '';
    // Remove zeros à esquerda
    const noLeadingZeros = digits.replace(/^0+/, '');
    // Se já vier com DDI (ex.: 55) mantém; caso contrário, assume Brasil (55)
    if (noLeadingZeros.startsWith('55') && noLeadingZeros.length >= 12) {
      return noLeadingZeros;
    }
    if (noLeadingZeros.length <= 11) {
      return `55${noLeadingZeros}`;
    }
    return noLeadingZeros;
  };

  const openWhatsApp = (phone?: string, message?: string) => {
    if (!phone) return;
    const number = normalizePhoneForWhatsApp(phone);
    if (!number) return;
    const url = message
      ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${number}`;
    window.open(url, '_blank');
  };

  const getProspectsByStatus = (status: string) => {
    return prospects.filter(prospect => prospect.status === status);
  };

  const getTotalValue = (status: string) => {
    return getProspectsByStatus(status)
      .reduce((sum, prospect) => sum + (prospect.expectedValue || 0), 0);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Estado e handlers para editar Próximo Contato
  const [isNextContactOpen, setIsNextContactOpen] = useState(false);
  const [editingProspectId, setEditingProspectId] = useState<string | null>(null);
  const [editNextContactDate, setEditNextContactDate] = useState('');

  const openNextContactDialog = (prospect: Prospect) => {
    setEditingProspectId(prospect.id);
    setEditNextContactDate(
      prospect.nextContactDate ? prospect.nextContactDate.toISOString().split('T')[0] : ''
    );
    setIsNextContactOpen(true);
  };

  const saveNextContactDate = async () => {
    if (!editingProspectId) return;
    try {
      const value = editNextContactDate ? Timestamp.fromDate(new Date(editNextContactDate)) : null;
      await updateDoc(doc(db, 'prospects', editingProspectId), {
        nextContactDate: value,
        updatedAt: Timestamp.now(),
      });
      setProspects(prev => prev.map(p => 
        p.id === editingProspectId 
          ? { ...p, nextContactDate: editNextContactDate ? new Date(editNextContactDate) : undefined }
          : p
      ));
      toast.success('Próximo contato atualizado!');
      setIsNextContactOpen(false);
      setEditingProspectId(null);
    } catch (error) {
      console.error('Erro ao atualizar próximo contato:', error);
      toast.error('Erro ao atualizar próximo contato');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">
            Visualização em Kanban dos seus prospects
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total de Prospects:</span>
            <Badge variant="secondary">{prospects.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Valor Total:</span>
            <Badge variant="default">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(prospects.reduce((sum, p) => sum + (p.expectedValue || 0), 0))}
            </Badge>
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2">
          {statusColumns.map((column) => (
            <div
              key={column.id}
              className={`flex-none transition-all ${
                expandedColumn
                  ? (expandedColumn === column.id ? 'w-[420px]' : 'w-[280px]')
                  : 'w-[300px]'
              }`}
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 min-w-0 flex-1 truncate">
                      <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                      <span className="truncate">{column.title}</span>
                    </CardTitle>
                    <div className="ml-2 flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {getProspectsByStatus(column.id).length}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => setExpandedColumn(prev => (prev === column.id ? null : column.id))}
                        aria-label={expandedColumn === column.id ? 'Recolher coluna' : 'Expandir coluna'}
                        title={expandedColumn === column.id ? 'Recolher coluna' : 'Expandir coluna'}
                      >
                        {expandedColumn === column.id ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(getTotalValue(column.id))}
                  </div>
                </CardHeader>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 h-[550px] overflow-y-auto ${
                        snapshot.isDraggingOver ? 'bg-muted/50' : ''
                      }`}
                    >
                      {getProspectsByStatus(column.id).map((prospect, index) => (
                        <Draggable 
                          key={prospect.id} 
                          draggableId={prospect.id} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`
                                p-3 bg-card border rounded-lg shadow-sm cursor-pointer
                                hover:shadow-md transition-shadow
                                ${snapshot.isDragging ? 'rotate-3 shadow-lg' : ''}
                              `}
                            >
                              <div className="space-y-2">
                                {/* Header do card */}
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="text-xs">
                                        {prospect.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">
                                        {prospect.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {prospect.email}
                                      </p>
                                    </div>
                                  </div>
                                  {/* Removed MoreHorizontal action button as requested */}
                                </div>

                                {/* Empresa */}
                                {prospect.company && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                                    <Building className="h-3 w-3" />
                                    <span className="truncate block">{prospect.company}</span>
                                  </div>
                                )}

                                {/* Valor esperado */}
                                {prospect.expectedValue && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <DollarSign className="h-3 w-3" />
                                    <span className="font-medium">
                                      {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                      }).format(prospect.expectedValue)}
                                    </span>
                                  </div>
                                )}

                                {/* Score */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-xs">
                                    <span className="text-muted-foreground">Score:</span>
                                    <span className={`font-medium ${getScoreColor(prospect.score)}`}>
                                      {prospect.score}%
                                    </span>
                                  </div>
                                  
                                  {/* Origem */}
                                  {prospect.source && (
                                    <Badge variant="outline" className="text-xs">
                                      {prospect.source}
                                    </Badge>
                                  )}
                                </div>

                                {/* Próximo contato */}
                                {prospect.nextContactDate && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {prospect.nextContactDate.toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                )}

                                {/* Ações rápidas */}
                                <div className="pt-1">
                                  <div className="grid grid-cols-2 gap-2">
                                    {prospect.phone ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-0 flex items-center justify-center"
                                        onClick={() => openWhatsApp(prospect.phone)}
                                      >
                                        <Phone className="h-3.5 w-3.5" />
                                      </Button>
                                    ) : (
                                      <div />
                                    )}
                                    <Button variant="outline" size="sm" className="h-7 px-0 flex items-center justify-center" onClick={() => openNextContactDialog(prospect)}>
                                      <Calendar className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </CardContent>
                  )}
                </Droppable>
              </Card>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Dialog: Editar Próximo Contato */}
      <Dialog open={isNextContactOpen} onOpenChange={setIsNextContactOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Próximo Contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-nextContactDate">Próximo Contato</Label>
            <Input
              id="edit-nextContactDate"
              type="date"
              value={editNextContactDate}
              onChange={(e) => setEditNextContactDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNextContactOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveNextContactDate}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};