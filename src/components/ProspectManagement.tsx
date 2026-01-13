import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Phone, 
  Mail, 
  Calendar,
  Star,
  Building,
  User,
  MapPin,
  DollarSign
} from 'lucide-react';
import { auth, db } from '@/config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { Prospect, ProspectActivity } from '@/types';
import { toast } from 'sonner';

interface ProspectManagementProps {
  userId: string;
  userName: string;
  userRole?: string;
}

export const ProspectManagement: React.FC<ProspectManagementProps> = ({ 
  userId, 
  userName,
  userRole = 'Comercial'
}) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [filteredProspects, setFilteredProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'Site' as Prospect['source'],
    status: 'Cold' as Prospect['status'],
    score: 0,
    notes: '',
    expectedValue: 0,
    closingProbability: 0,
    nextContactDate: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  useEffect(() => {
    loadProspects();
  }, [userId]);

  useEffect(() => {
    filterProspects();
  }, [prospects, searchTerm, statusFilter, sourceFilter]);

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

  const filterProspects = () => {
    let filtered = prospects;

    if (searchTerm) {
      filtered = filtered.filter(prospect =>
        prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(prospect => prospect.status === statusFilter);
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(prospect => prospect.source === sourceFilter);
    }

    setFilteredProspects(filtered);
  };

  const handleCreateProspect = async () => {
    try {
      const newProspect = {
        ...formData,
        assignedTo: userId,
        assignedToName: userName,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        nextContactDate: formData.nextContactDate ? Timestamp.fromDate(new Date(formData.nextContactDate)) : null,
      };

      await addDoc(collection(db, 'prospects'), newProspect);
      
      toast.success('Prospect criado com sucesso!');
      setIsCreateOpen(false);
      resetForm();
      loadProspects();
    } catch (error) {
      console.error('Erro ao criar prospect:', error);
      toast.error('Erro ao criar prospect');
    }
  };

  const handleEditProspect = async () => {
    if (!editingProspect) return;

    try {
      const updatedData = {
        ...formData,
        updatedAt: Timestamp.now(),
        nextContactDate: formData.nextContactDate ? Timestamp.fromDate(new Date(formData.nextContactDate)) : null,
      };

      await updateDoc(doc(db, 'prospects', editingProspect.id), updatedData);
      
      toast.success('Prospect atualizado com sucesso!');
      setIsEditOpen(false);
      setEditingProspect(null);
      resetForm();
      loadProspects();
    } catch (error) {
      console.error('Erro ao atualizar prospect:', error);
      toast.error('Erro ao atualizar prospect');
    }
  };

  const handleDeleteProspect = async (prospectId: string) => {
    if (!confirm('Tem certeza que deseja excluir este prospect?')) return;

    try {
      await deleteDoc(doc(db, 'prospects', prospectId));
      toast.success('Prospect excluído com sucesso!');
      loadProspects();
    } catch (error) {
      console.error('Erro ao excluir prospect:', error);
      toast.error('Erro ao excluir prospect');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      source: 'Site',
      status: 'Cold',
      score: 0,
      notes: '',
      expectedValue: 0,
      closingProbability: 0,
      nextContactDate: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      }
    });
  };

  const openEditDialog = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setFormData({
      name: prospect.name,
      email: prospect.email,
      phone: prospect.phone || '',
      company: prospect.company || '',
      position: prospect.position || '',
      source: prospect.source,
      status: prospect.status,
      score: prospect.score,
      notes: prospect.notes || '',
      expectedValue: prospect.expectedValue || 0,
      closingProbability: prospect.closingProbability || 0,
      nextContactDate: prospect.nextContactDate ? prospect.nextContactDate.toISOString().split('T')[0] : '',
      address: prospect.address || {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      }
    });
    setIsEditOpen(true);
  };

  const openViewDialog = (prospect: Prospect) => {
    // Garantir que o prospect tenha uma estrutura de endereço válida
    const safeProspect = {
      ...prospect,
      address: typeof prospect.address === 'object' ? prospect.address : {
        street: prospect.address || '',
        city: '',
        state: '',
        zipCode: ''
      }
    };
    setSelectedProspect(safeProspect);
    setIsViewOpen(true);
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'Closed-Won': return 'Won';
      case 'Closed-Lost': return 'Lost';
      case 'Qualified': return 'Qualified';
      case 'Negotiation': return 'Negotiation';
      case 'Proposal': return 'Proposal';
      case 'Hot': return 'Hot';
      case 'Warm': return 'Warm';
      case 'Cold': return 'Cold';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Cold': return 'bg-blue-100 text-blue-800';
      case 'Warm': return 'bg-yellow-100 text-yellow-800';
      case 'Hot': return 'bg-orange-100 text-orange-800';
      case 'Qualified': return 'bg-green-100 text-green-800';
      case 'Proposal': return 'bg-purple-100 text-purple-800';
      case 'Negotiation': return 'bg-indigo-100 text-indigo-800';
      case 'Closed-Won': return 'bg-emerald-100 text-emerald-800';
      case 'Closed-Lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
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
          <h1 className="text-2xl font-bold">Gerenciar Prospects</h1>
          <p className="text-muted-foreground">
            Gerencie seus prospects e oportunidades de vendas
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-cerrado-green2 hover:bg-cerrado-green1">
          <Plus className="h-4 w-4 mr-2" />
          Novo Prospect
        </Button>
      </div>

      {/* Filtros */}
      <div className="pt-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* Filtro de Status */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-full transition-all ${statusFilter !== 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'}`}
                  title={statusFilter !== 'all' ? `Filtro: ${statusFilter}` : "Filtro de status"}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <div className="p-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="Cold">Cold</SelectItem>
                      <SelectItem value="Warm">Warm</SelectItem>
                      <SelectItem value="Hot">Hot</SelectItem>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="Proposal">Proposal</SelectItem>
                      <SelectItem value="Negotiation">Negotiation</SelectItem>
                      <SelectItem value="Closed-Won">Closed-Won</SelectItem>
                      <SelectItem value="Closed-Lost">Closed-Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>

            {/* Filtro de Origem */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-full transition-all ${sourceFilter !== 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'}`}
                  title={sourceFilter !== 'all' ? `Filtro: ${sourceFilter}` : "Filtro de origem"}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <div className="p-2">
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Origens</SelectItem>
                      <SelectItem value="Site">Site</SelectItem>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="Telemarketing">Telemarketing</SelectItem>
                      <SelectItem value="Evento">Evento</SelectItem>
                      <SelectItem value="Rede Social">Rede Social</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Tabela de Prospects */}
      <Card>
        <CardHeader>
          <CardTitle>Prospects ({filteredProspects.length})</CardTitle>
        </CardHeader>
        <CardContent className="h-[550px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Prospect</TableHead>
                <TableHead className="text-center">Empresa</TableHead>
                <TableHead className="text-center">Cargo</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Origem</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Valor Esperado</TableHead>
                <TableHead className="text-center">Próximo Contato</TableHead>
                <TableHead className="w-24 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProspects.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {prospect.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium truncate max-w-[200px]" title={prospect.name}>
                          {prospect.name.length > 20
                            ? prospect.name.substring(0, 20) + '...'
                            : prospect.name
                          }
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-medium truncate max-w-[200px] mx-auto" title={prospect.company || '-'}>
                      {(prospect.company || '-').length > 20
                        ? (prospect.company || '-').substring(0, 20) + '...'
                        : (prospect.company || '-')
                      }
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm">{prospect.position || '-'}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${getStatusColor(prospect.status)} w-20 justify-center`}>
                      {getStatusDisplayName(prospect.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="w-20 justify-center">
                      {prospect.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`font-medium ${getScoreColor(prospect.score)}`}>
                      {prospect.score}%
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {prospect.expectedValue ? new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(prospect.expectedValue) : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {prospect.nextContactDate 
                      ? prospect.nextContactDate.toLocaleDateString('pt-BR')
                      : '-'
                    }
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
                          onClick={() => openViewDialog(prospect)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openEditDialog(prospect)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteProspect(prospect.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredProspects.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum prospect encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criação */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Prospect</DialogTitle>
            <DialogDescription>
              Adicione um novo prospect ao seu pipeline de vendas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="Nome da empresa"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="position">Cargo</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  placeholder="Diretor, Gerente..."
                />
              </div>
              <div>
                <Label htmlFor="source">Origem</Label>
                <Select value={formData.source} onValueChange={(value) => setFormData({...formData, source: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Site">Site</SelectItem>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="Telemarketing">Telemarketing</SelectItem>
                    <SelectItem value="Evento">Evento</SelectItem>
                    <SelectItem value="Rede Social">Rede Social</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cold">Cold</SelectItem>
                    <SelectItem value="Warm">Warm</SelectItem>
                    <SelectItem value="Hot">Hot</SelectItem>
                    <SelectItem value="Qualified">Qualified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="score">Score (0-100)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData({...formData, score: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="expectedValue">Valor Esperado (R$)</Label>
                <Input
                  id="expectedValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.expectedValue}
                  onChange={(e) => setFormData({...formData, expectedValue: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="nextContactDate">Próximo Contato</Label>
                <Input
                  id="nextContactDate"
                  type="date"
                  value={formData.nextContactDate}
                  onChange={(e) => setFormData({...formData, nextContactDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Observações sobre o prospect..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProspect}>
              Criar Prospect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Prospect</DialogTitle>
            <DialogDescription>
              Atualize as informações do prospect
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="edit-company">Empresa</Label>
                <Input
                  id="edit-company"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="Nome da empresa"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-position">Cargo</Label>
                <Input
                  id="edit-position"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  placeholder="Diretor, Gerente..."
                />
              </div>
              <div>
                <Label htmlFor="edit-source">Origem</Label>
                <Select value={formData.source} onValueChange={(value) => setFormData({...formData, source: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Site">Site</SelectItem>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="Telemarketing">Telemarketing</SelectItem>
                    <SelectItem value="Evento">Evento</SelectItem>
                    <SelectItem value="Rede Social">Rede Social</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cold">Cold</SelectItem>
                    <SelectItem value="Warm">Warm</SelectItem>
                    <SelectItem value="Hot">Hot</SelectItem>
                    <SelectItem value="Qualified">Qualified</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                    <SelectItem value="Closed-Won">Closed-Won</SelectItem>
                    <SelectItem value="Closed-Lost">Closed-Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-score">Score (0-100)</Label>
                <Input
                  id="edit-score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData({...formData, score: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="edit-expectedValue">Valor Esperado (R$)</Label>
                <Input
                  id="edit-expectedValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.expectedValue}
                  onChange={(e) => setFormData({...formData, expectedValue: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="edit-nextContactDate">Próximo Contato</Label>
                <Input
                  id="edit-nextContactDate"
                  type="date"
                  value={formData.nextContactDate}
                  onChange={(e) => setFormData({...formData, nextContactDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Observações sobre o prospect..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditProspect}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Prospect</DialogTitle>
            <DialogDescription>
              Informações completas do prospect
            </DialogDescription>
          </DialogHeader>

          {selectedProspect && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Nome</Label>
                  <p className="text-lg font-semibold">{selectedProspect.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Empresa</Label>
                  <p className="text-lg">{selectedProspect.company}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                  <p className="text-lg">{selectedProspect.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Telefone</Label>
                  <p className="text-lg">{selectedProspect.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Cargo</Label>
                  <p className="text-lg">{selectedProspect.position}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge className={getStatusColor(selectedProspect.status)}>
                    {getStatusDisplayName(selectedProspect.status)}
                  </Badge>
                </div>
              </div>

              {/* Informações de Contato */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Informações de Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Fonte</Label>
                    <p className="text-lg">{selectedProspect.source}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Próximo Contato</Label>
                    <p className="text-lg">
                      {selectedProspect.nextContactDate 
                        ? selectedProspect.nextContactDate.toLocaleDateString('pt-BR')
                        : 'Não definido'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              {(() => {
                // Garantir que temos dados de endereço válidos
                const address = selectedProspect.address;
                const hasAddress = address && (
                  (typeof address === 'string' && String(address).trim() !== '') ||
                  (typeof address === 'object' && address && (address.street || address.city || address.state || address.zipCode))
                );
                
                if (!hasAddress) return null;

                // Extrair dados de forma segura
                let street = '';
                let city = '';
                let state = '';
                let zipCode = '';

                if (typeof address === 'object') {
                  street = address.street || '';
                  city = address.city || '';
                  state = address.state || '';
                  zipCode = address.zipCode || '';
                } else if (typeof address === 'string') {
                  street = address;
                }

                return (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-3">Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {street && (
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-gray-500">Endereço</Label>
                          <p className="text-lg">{String(street)}</p>
                        </div>
                      )}
                      {city && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Cidade</Label>
                          <p className="text-lg">{String(city)}</p>
                        </div>
                      )}
                      {state && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Estado</Label>
                          <p className="text-lg">{String(state)}</p>
                        </div>
                      )}
                      {zipCode && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">CEP</Label>
                          <p className="text-lg">{String(zipCode)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Observações */}
              {selectedProspect.notes && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Observações</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                    {selectedProspect.notes}
                  </p>
                </div>
              )}

              {/* Datas */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Datas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Criado em</Label>
                    <p className="text-lg">
                      {selectedProspect.createdAt?.toLocaleDateString('pt-BR')} às{' '}
                      {selectedProspect.createdAt?.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Última atualização</Label>
                    <p className="text-lg">
                      {selectedProspect.updatedAt?.toLocaleDateString('pt-BR')} às{' '}
                      {selectedProspect.updatedAt?.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setIsViewOpen(false);
              openEditDialog(selectedProspect!);
            }}>
              Editar Prospect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};