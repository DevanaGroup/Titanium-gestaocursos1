import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { db, auth } from '@/config/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Archive, RotateCcw, MoreHorizontal, User, Calendar, FileText, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getTasksByCollaboratorClientId } from '@/services/taskService';
import { getCollaborators } from '@/services/collaboratorService';
import { collection, getDocs, query, where, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { createTaskAuditLog } from '@/services/taskAuditService';
import TaskProcessDialog from './TaskProcessDialog';
import { Collaborator } from '@/types';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: any;
  assignee?: string;
  assignedToName?: string;
  createdBy?: string;
  createdByName?: string;
  clientId?: string;
  clientName?: string;
  archived?: boolean;
  archivedAt?: any;
}

export default function ArchivedTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  // Estados para o Dialog de Trâmites
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [selectedTaskForProcess, setSelectedTaskForProcess] = useState<Task | null>(null);

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente'
  };

  const statusOptions = [
    { value: 'todo', label: 'A Fazer' },
    { value: 'in-progress', label: 'Em Progresso' },
    { value: 'review', label: 'Em Revisão' },
    { value: 'done', label: 'Concluída' }
  ];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, 'collaborators_unified', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.hierarchyLevel || 'Estagiário/Auxiliar');
          }
        } catch (error) {
          console.error('Erro ao buscar role do usuário:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadCollaborators = async () => {
      try {
        const collabs = await getCollaborators();
        setCollaborators(collabs);
      } catch (error) {
        console.error('Erro ao carregar colaboradores:', error);
      }
    };
    loadCollaborators();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadArchivedTasks();
    }
  }, [currentUser, userRole, collaborators]);

  // Inicializar filteredTasks quando tasks mudar
  useEffect(() => {
    setFilteredTasks(tasks);
  }, [tasks]);

  const loadArchivedTasks = async () => {
    try {
      setIsLoading(true);

      // Buscar tarefas arquivadas
      if ((userRole === 'Cliente Externo' || userRole === 'Cliente') && currentUser) {
        // Cliente Externo ou Cliente: buscar tarefas do cliente vinculado
        const tasks = await getTasksByCollaboratorClientId(currentUser.uid);
        const archivedTasks = tasks
          .filter(task => task.archived === true)
          .map(task => {
            // Buscar colaborador para obter apenas o firstName
            let assignedToName = task.assignedToName || '';
            const assigneeId = (task as any).assignedTo || (task as any).assignee;
            if (assigneeId && collaborators.length > 0) {
              const collaborator = collaborators.find(c => c.uid === assigneeId);
              if (collaborator) {
                assignedToName = collaborator.firstName || collaborator.email || 'Colaborador';
              } else {
                // Se não encontrou o colaborador, extrair firstName do nome completo
                assignedToName = getFirstName(assignedToName);
              }
            } else {
              // Se não tem assigneeId, extrair firstName do nome completo
              assignedToName = getFirstName(assignedToName);
            }
            // Converter status do TaskStatus para o formato esperado
            const statusMap: Record<string, 'todo' | 'in-progress' | 'review' | 'done'> = {
              'Pendente': 'todo',
              'Em andamento': 'in-progress',
              'Bloqueada': 'review',
              'Concluída': 'done'
            };
            
            // Converter priority do TaskPriority para o formato esperado
            const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
              'Baixa': 'low',
              'Média': 'medium',
              'Alta': 'high',
              'Urgente': 'urgent'
            };
            
            return {
              ...task,
              status: statusMap[task.status as string] || 'todo',
              priority: priorityMap[(task as any).priority as string] || 'medium',
              assignedToName
            } as Task;
          });
        setTasks(archivedTasks);
      } else {
        // Outros usuários: buscar todas as tarefas arquivadas
        const tasksQuery = query(collection(db, 'tasks'), where('archived', '==', true));
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksData = tasksSnapshot.docs.map(doc => {
          const data = doc.data();
          // Buscar colaborador para obter apenas o firstName
          let assignedToName = data.assignedToName || '';
          const assigneeId = data.assignedTo || data.assignee;
          if (assigneeId && collaborators.length > 0) {
            const collaborator = collaborators.find(c => c.uid === assigneeId);
            if (collaborator) {
              assignedToName = collaborator.firstName || collaborator.email || 'Colaborador';
            } else {
              // Se não encontrou o colaborador, extrair firstName do nome completo
              assignedToName = getFirstName(assignedToName);
            }
          } else {
            // Se não tem assigneeId, extrair firstName do nome completo
            assignedToName = getFirstName(assignedToName);
          }
          
          // Converter status do TaskStatus para o formato esperado
          const statusMap: Record<string, 'todo' | 'in-progress' | 'review' | 'done'> = {
            'Pendente': 'todo',
            'Em andamento': 'in-progress',
            'Bloqueada': 'review',
            'Concluída': 'done'
          };
          
          // Converter priority do TaskPriority para o formato esperado
          const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
            'Baixa': 'low',
            'Média': 'medium',
            'Alta': 'high',
            'Urgente': 'urgent'
          };
          
          return {
            id: doc.id,
            ...data,
            status: statusMap[data.status as string] || 'todo',
            priority: priorityMap[data.priority as string] || 'medium',
            assignedToName
          } as Task;
        });
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas arquivadas:', error);
      toast.error('Erro ao carregar tarefas arquivadas');
    } finally {
      setIsLoading(false);
    }
  };

  // Efeito para filtrar tarefas baseado no termo de busca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTasks(tasks);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = tasks.filter(task => {
      const titleMatch = task.title?.toLowerCase().includes(searchLower);
      const descriptionMatch = task.description?.toLowerCase().includes(searchLower);
      const clientMatch = task.clientName?.toLowerCase().includes(searchLower);
      const responsibleMatch = task.assignedToName?.toLowerCase().includes(searchLower);
      const priorityMatch = priorityLabels[task.priority]?.toLowerCase().includes(searchLower);
      
      return titleMatch || descriptionMatch || clientMatch || responsibleMatch || priorityMatch;
    });

    setFilteredTasks(filtered);
  }, [searchTerm, tasks]);

  const openProcessDialog = (task: Task) => {
    setSelectedTaskForProcess(task);
    setIsProcessDialogOpen(true);
  };

  // Função para mapear status do Kanban para status do sistema
  const mapKanbanStatusToSystemStatus = (kanbanStatus: string) => {
    switch (kanbanStatus) {
      case 'todo':
        return 'Pendente';
      case 'in-progress':
        return 'Em andamento';
      case 'done':
        return 'Concluída';
      case 'review':
        return 'Bloqueada';
      default:
        return 'Pendente';
    }
  };

  const handleRestoreTask = async (task: Task, newStatus: 'todo' | 'in-progress' | 'review' | 'done') => {
    try {
      // Converter status do Kanban para status do sistema
      const systemStatus = mapKanbanStatusToSystemStatus(newStatus);
      
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        status: systemStatus,
        archived: false,
        archivedAt: null,
        updatedAt: serverTimestamp()
      });

      // Criar log de auditoria
      const statusLabel = statusOptions.find(s => s.value === newStatus)?.label || newStatus;
      await createTaskAuditLog(
        'RESTORE_TASK',
        `Tarefa "${task.title}" restaurada para "${statusLabel}"`,
        task.id,
        task.title,
        {
          status: { from: 'Arquivada', to: statusLabel }
        }
      );

      toast.success(`Tarefa restaurada para "${statusOptions.find(s => s.value === newStatus)?.label}"`);
      loadArchivedTasks();
    } catch (error) {
      console.error('Erro ao restaurar tarefa:', error);
      toast.error('Erro ao restaurar tarefa');
    }
  };

  // Função para extrair apenas o firstName de um nome completo
  const getFirstName = (fullName: string): string => {
    if (!fullName) return '';
    // Se o nome contém espaços, pegar apenas a primeira palavra
    const parts = fullName.trim().split(' ');
    return parts[0] || fullName;
  };

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    try {
      if (date instanceof Date) {
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
      }
      if (date.seconds) {
        return format(new Date(date.seconds * 1000), 'dd/MM/yyyy', { locale: ptBR });
      }
      if (typeof date === 'string') {
        return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando tarefas arquivadas...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Archive className="h-6 w-6" />
            Tarefas Arquivadas
          </h1>
          <p className="text-muted-foreground mt-1">
            {searchTerm ? `${filteredTasks.length} de ${tasks.length} tarefa(s)` : `${tasks.length} tarefa(s) arquivada(s)`}
          </p>
        </div>
        
        {/* Campo de busca */}
        <div className="flex justify-end">
          <div className="relative max-w-xl w-[400px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por título, cliente, responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none hover:bg-accent/30 rounded-full transition-colors"
            />
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma tarefa arquivada</p>
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 && searchTerm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma tarefa encontrada com o termo "{searchTerm}"</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setSearchTerm('')}
            >
              Limpar busca
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-center">Título</TableHead>
                  <TableHead className="text-center">Prioridade</TableHead>
                  <TableHead className="text-center">Cliente</TableHead>
                  <TableHead className="text-center">Responsável</TableHead>
                  <TableHead className="text-center">Vencimento</TableHead>
                  <TableHead className="text-center">Arquivada em</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-semibold text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{task.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Badge className={priorityColors[task.priority] || priorityColors.medium}>
                          {priorityLabels[task.priority] || 'Média'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {task.clientName ? (
                        <div className="flex justify-center">
                          <Badge variant="outline">{task.clientName}</Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{task.assignedToName || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {task.dueDate ? (
                        <div className="flex items-center justify-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(task.dueDate)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {task.archivedAt ? (
                        <div className="flex items-center justify-center gap-2">
                          <Archive className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(task.archivedAt)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            openProcessDialog(task);
                          }}>
                            <FileText className="mr-2 h-4 w-4" />
                            Ver Trâmites
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/task/${task.id}`)}>
                            <User className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          {/* Cliente Externo e Cliente só podem visualizar, não podem restaurar */}
                          {(userRole !== 'Cliente Externo' && userRole !== 'Cliente') && (
                            <>
                              <DropdownMenuSeparator />
                              {statusOptions.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestoreTask(task, option.value as 'todo' | 'in-progress' | 'review' | 'done');
                                  }}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Restaurar para {option.label}
                                </DropdownMenuItem>
                              ))}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Trâmites */}
      {selectedTaskForProcess && (
        <TaskProcessDialog
          task={selectedTaskForProcess}
          isOpen={isProcessDialogOpen}
          onOpenChange={(open) => {
            setIsProcessDialogOpen(open);
            if (!open) {
              setSelectedTaskForProcess(null);
            }
          }}
        />
      )}
    </div>
  );
}

