import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { db, auth } from '@/config/firebase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Clock, Circle, CheckCircle2, AlertCircle, PlusCircle, Edit, Trash2, MoreHorizontal, History, ArrowLeft, User, FileText, Archive, Search, X, Filter } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collaborator, HierarchyLevel } from '@/types';
import { hasPermission } from '@/utils/hierarchyUtils';
import { getCollaborators } from '@/services/collaboratorService';
import { getTasksByAssignee, getTasksByCollaboratorClientId } from '@/services/taskService';
import { createTaskAuditLog, TASK_ACTIONS } from '@/services/taskAuditService';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import TaskProcessDialog from './TaskProcessDialog';
// Removido: componentes de visualização alternativa
import { initializeTaskProcess } from '@/services/processService';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { whatsappNotificationService } from '@/services/whatsappNotificationService';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignee?: string;
  assignedToName?: string;
  createdBy?: string;
  createdByName?: string;
  clientId?: string;
  clientName?: string;
  archived?: boolean;
}

interface Column {
  id: 'todo' | 'in-progress' | 'review' | 'done';
  title: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [newTask, setNewTask] = useState<Omit<Task, 'id'>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    assignee: '',
    clientId: '',
    clientName: ''
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('Colaborador');
  const [viewAllTasks, setViewAllTasks] = useState<boolean>(false);
  const [currentCollaborator, setCurrentCollaborator] = useState<Collaborator | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [filteredAuditLogs, setFilteredAuditLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyStartDate, setHistoryStartDate] = useState<Date | undefined>(undefined);
  const [historyEndDate, setHistoryEndDate] = useState<Date | undefined>(undefined);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  
  // Estados para o Dialog de Trâmites
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [selectedTaskForProcess, setSelectedTaskForProcess] = useState<Task | null>(null);
  
  // Estados para confirmação de exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // Removido: visualização será sempre kanban

  const navigate = useNavigate();

  const columns: Column[] = [
    { 
      id: 'todo', 
      title: 'A Fazer', 
      color: 'border-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      icon: <Circle className="w-4 h-4 text-blue-500" />
    },
    { 
      id: 'in-progress', 
      title: 'Em Progresso', 
      color: 'border-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      icon: <Clock className="w-4 h-4 text-yellow-500" />
    },
    { 
      id: 'review', 
      title: 'Em Revisão', 
      color: 'border-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-800',
      icon: <AlertCircle className="w-4 h-4 text-purple-500" />
    },
    { 
      id: 'done', 
      title: 'Concluídas', 
      color: 'border-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
    }
  ];

  // Função para mapear status do sistema para status do Kanban
  const mapSystemStatusToKanbanStatus = (systemStatus: string) => {
    switch (systemStatus) {
      case 'Pendente':
        return 'todo';
      case 'Em andamento':
        return 'in-progress';
      case 'Concluída':
        return 'done';
      case 'Bloqueada':
        return 'review';
      default:
        return 'todo';
    }
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

  // Função para tratamento mais cuidadoso da data
  const parseToDisplayDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Se já estiver no formato DD/MM/YYYY, retornar como está
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return dateString;
      }
      
      // Se estiver no formato YYYY-MM-DD, converter para exibição
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      }
      
      // Tentar extrair data de um objeto Date
      if (dateString instanceof Date && !isNaN(dateString.getTime())) {
        const day = dateString.getDate().toString().padStart(2, '0');
        const month = (dateString.getMonth() + 1).toString().padStart(2, '0');
        const year = dateString.getFullYear();
        return `${day}/${month}/${year}`;
      }
      
      return dateString;
    } catch (error) {
      console.error("Erro ao processar data para exibição:", error);
      return dateString || '';
    }
  };

  const parseToStorageDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Se já estiver no formato YYYY-MM-DD, retornar como está
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      
      // Se estiver no formato DD/MM/YYYY, converter para armazenamento
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('/');
        return `${year}-${month}-${day}`;
      }
      
      // Tentar extrair data de um objeto Date
      if (dateString instanceof Date && !isNaN(dateString.getTime())) {
        const day = dateString.getDate().toString().padStart(2, '0');
        const month = (dateString.getMonth() + 1).toString().padStart(2, '0');
        const year = dateString.getFullYear();
        return `${year}-${month}-${day}`;
      }
      
      return dateString;
    } catch (error) {
      console.error("Erro ao processar data para armazenamento:", error);
      return dateString || '';
    }
  };

  // Função utilitária para converter string de data DD/MM/YYYY para formato ISO YYYY-MM-DD
  const formatDateForStorage = (dateString: string) => {
    if (!dateString) return '';
    
    // Se já estiver no formato YYYY-MM-DD, retorna como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Se estiver no formato DD/MM/YYYY, converte para YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    }
    
    return dateString;
  };

  // Obter usuário atual
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // Buscar dados do usuário no Firestore - coleção users
          let userData = null;
          let userDoc = null;
          
          // Buscar dados do usuário na coleção users
          const userDocRef = await getDoc(doc(db, "users", user.uid));
          if (userDocRef.exists()) {
            userData = userDocRef.data();
            userDoc = userDocRef;
            console.log("🔍 KanbanBoard - Dados do usuário (users):", userData);
            
            setCurrentCollaborator({
              id: userDoc.id,
              uid: user.uid,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              birthDate: userData.birthDate?.toDate() || new Date(),
              hierarchyLevel: userData.hierarchyLevel as HierarchyLevel,
              customPermissions: userData.customPermissions,
              createdAt: userData.createdAt?.toDate() || new Date(),
              updatedAt: userData.updatedAt?.toDate() || new Date()
            } as Collaborator);
          } else {
            console.log("❌ KanbanBoard - Usuário não encontrado na coleção users");
          }
          
          setUserRole(userData?.hierarchyLevel || "Nível 5");
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
        }
      } else {
        setCurrentUser(null);
        setCurrentCollaborator(null);
        setUserRole('Colaborador');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setTasks([]);
      return;
    }

    setIsLoading(true);
    let unsubscribe: (() => void) | null = null;

    try {
      // Se o usuário pode ver todas as tarefas e estiver com a opção ativada
      if (canViewAllTasks() && viewAllTasks) {
        const tasksCollection = collection(db, "tasks");
        
        unsubscribe = onSnapshot(tasksCollection, (snapshot) => {
          const tasksList = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Corrigir nome do responsável se estiver com problema
            let correctedAssignedToName = data.assignedToName;
            if (!correctedAssignedToName || 
                correctedAssignedToName === 'undefined undefined' || 
                correctedAssignedToName.trim() === '' ||
                correctedAssignedToName.includes('undefined')) {
              
              // Buscar colaborador na lista
              const collaborator = collaborators.find(c => c.uid === data.assignedTo);
              if (collaborator) {
                // Mostrar apenas o firstName
                correctedAssignedToName = collaborator.firstName || collaborator.email || 'Colaborador';
              } else if (data.assignedTo === currentUser?.uid) {
                correctedAssignedToName = currentUser?.displayName || currentUser?.email || 'Você';
              } else {
                correctedAssignedToName = 'Responsável';
              }
            }

            // Formatar a data com segurança
            let formattedDate = '';
            if (data.dueDate) {
              let dueDate;
              if (data.dueDate.toDate) {
                dueDate = data.dueDate.toDate();
              } else if (typeof data.dueDate === 'string') {
                dueDate = new Date(data.dueDate);
              } else {
                dueDate = data.dueDate;
              }
              
              if (dueDate instanceof Date && !isNaN(dueDate.getTime())) {
                formattedDate = format(dueDate, "yyyy-MM-dd");
              }
            }
            
            return {
              id: doc.id,
              title: data.title,
              description: data.description,
              status: mapSystemStatusToKanbanStatus(data.status),
              priority: (data.priority || 'medium').toLowerCase() as 'low' | 'medium' | 'high',
              dueDate: formattedDate,
              assignee: data.assignedTo,
              assignedToName: correctedAssignedToName,
              createdBy: data.createdBy,
              createdByName: data.createdByName,
              clientId: data.clientId,
              clientName: data.clientName,
              archived: data.archived || false
            };
          }).filter(task => !task.archived) as Task[]; // Filtrar tarefas arquivadas
          
          setTasks(tasksList);
          setIsLoading(false);
        }, (error) => {
          console.error("Erro ao escutar tarefas:", error);
          toast.error("Erro ao atualizar tarefas em tempo real");
          setIsLoading(false);
        });
      } else {
        // Buscar apenas tarefas atribuídas ao usuário atual com tempo real
        const userTasksQuery = query(
          collection(db, "tasks"),
          where("assignedTo", "==", currentUser.uid)
        );
        
        unsubscribe = onSnapshot(userTasksQuery, (snapshot) => {
          const tasksList = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Corrigir nome do responsável se estiver com problema
            let correctedAssignedToName = data.assignedToName;
            if (!correctedAssignedToName || 
                correctedAssignedToName === 'undefined undefined' || 
                correctedAssignedToName.trim() === '' ||
                correctedAssignedToName.includes('undefined')) {
              
              // Buscar colaborador na lista
              const collaborator = collaborators.find(c => c.uid === data.assignedTo);
              if (collaborator) {
                // Mostrar apenas o firstName
                correctedAssignedToName = collaborator.firstName || collaborator.email || 'Colaborador';
              } else if (data.assignedTo === currentUser?.uid) {
                correctedAssignedToName = currentUser?.displayName || currentUser?.email || 'Você';
              } else {
                correctedAssignedToName = 'Responsável';
              }
            }

            // Formatar a data com segurança
            let formattedDate = '';
            if (data.dueDate) {
              let dueDate;
              if (data.dueDate.toDate) {
                dueDate = data.dueDate.toDate();
              } else if (typeof data.dueDate === 'string') {
                dueDate = new Date(data.dueDate);
              } else {
                dueDate = data.dueDate;
              }
              
              if (dueDate instanceof Date && !isNaN(dueDate.getTime())) {
                formattedDate = format(dueDate, "yyyy-MM-dd");
              }
            }

            return {
              id: doc.id,
              title: data.title,
              description: data.description,
              status: mapSystemStatusToKanbanStatus(data.status),
              priority: (data.priority || 'medium').toLowerCase() as 'low' | 'medium' | 'high',
              dueDate: formattedDate,
              assignee: data.assignedTo,
              assignedToName: correctedAssignedToName,
              createdBy: data.createdBy,
              createdByName: data.createdByName,
              clientId: data.clientId,
              clientName: data.clientName,
              archived: data.archived || false
            };
          }).filter(task => !task.archived) as Task[]; // Filtrar tarefas arquivadas
          
          setTasks(tasksList);
          setIsLoading(false);
        }, (error) => {
          console.error("Erro ao escutar tarefas do usuário:", error);
          toast.error("Erro ao atualizar tarefas em tempo real");
          setIsLoading(false);
        });
      }
    } catch (error) {
      console.error("Erro ao configurar escuta de tarefas:", error);
      toast.error("Não foi possível carregar as tarefas");
      setIsLoading(false);
    }

    // Cleanup function para cancelar a escuta quando o componente desmontar
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, userRole, viewAllTasks, collaborators]);

  // Refazer busca de tarefas quando colaboradores são carregados para corrigir nomes
  useEffect(() => {
    if (collaborators.length > 0 && currentUser) {
      // Re-executar fetchTasks apenas se houver tarefas com nomes incorretos
      const hasIncorrectNames = tasks.some(task => 
        !task.assignedToName || 
        task.assignedToName === 'undefined undefined' || 
        task.assignedToName.includes('undefined')
      );
      
      if (hasIncorrectNames) {
        const refetchTasks = async () => {
          if (!currentUser) return;
          
          try {
            let tasksList: Task[] = [];
            
            if (canViewAllTasks() && viewAllTasks) {
              const tasksCollection = collection(db, "tasks");
              const tasksSnapshot = await getDocs(tasksCollection);
              tasksList = tasksSnapshot.docs.map(doc => {
                const data = doc.data();
                
                // Corrigir nome do responsável
                let correctedAssignedToName = data.assignedToName;
                if (!correctedAssignedToName || 
                    correctedAssignedToName === 'undefined undefined' || 
                    correctedAssignedToName.trim() === '' ||
                    correctedAssignedToName.includes('undefined')) {
                  
                  const collaborator = collaborators.find(c => c.uid === data.assignedTo);
                  if (collaborator) {
                    const firstName = collaborator.firstName || '';
                    const lastName = collaborator.lastName || '';
                    correctedAssignedToName = `${firstName} ${lastName}`.trim() || collaborator.email || 'Colaborador';
                  } else if (data.assignedTo === currentUser?.uid) {
                    correctedAssignedToName = currentUser?.displayName || currentUser?.email || 'Você';
                  } else {
                    correctedAssignedToName = 'Responsável';
                  }
                }
                
                return {
                  id: doc.id,
                  ...data,
                  assignedToName: correctedAssignedToName,
                  status: mapSystemStatusToKanbanStatus(data.status),
                };
              }) as Task[];
            } else {
              // Se for Cliente Externo, buscar apenas tarefas do seu cliente
              let tasks;
              if (userRole === "Cliente Externo") {
                tasks = await getTasksByCollaboratorClientId(currentUser.uid);
              } else {
                tasks = await getTasksByAssignee(currentUser.uid);
              }
              
              tasksList = tasks.map(task => {
                let formattedDate = '';
                if (task.dueDate) {
                  if (task.dueDate instanceof Date && !isNaN(task.dueDate.getTime())) {
                    formattedDate = format(task.dueDate, "yyyy-MM-dd");
                  } else if (typeof task.dueDate === 'string' && !isNaN(Date.parse(task.dueDate))) {
                    formattedDate = format(new Date(task.dueDate), "yyyy-MM-dd");
                  }
                }

                let correctedAssignedToName = task.assignedToName;
                if (!correctedAssignedToName || 
                    correctedAssignedToName === 'undefined undefined' || 
                    correctedAssignedToName.trim() === '' ||
                    correctedAssignedToName.includes('undefined')) {
                  
                  const collaborator = collaborators.find(c => c.uid === task.assignedTo);
                  if (collaborator) {
                    // Mostrar apenas o firstName
                    correctedAssignedToName = collaborator.firstName || collaborator.email || 'Colaborador';
                  } else if (task.assignedTo === currentUser?.uid) {
                    correctedAssignedToName = currentUser?.displayName || currentUser?.email || 'Você';
                  } else {
                    correctedAssignedToName = 'Responsável';
                  }
                }

                return {
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  status: mapSystemStatusToKanbanStatus(task.status),
                  priority: task.priority.toLowerCase() as 'low' | 'medium' | 'high',
                  dueDate: formattedDate,
                  assignee: task.assignedTo,
                  assignedToName: correctedAssignedToName,
                  createdBy: task.createdBy,
                  createdByName: task.createdByName
                };
              });
            }
            
            setTasks(tasksList);
          } catch (error) {
            console.error("Erro ao refazer busca de tarefas:", error);
          }
        };
        
        refetchTasks();
      }
    }
  }, [collaborators]);

  useEffect(() => {
    const fetchCollaborators = async () => {
      console.log("🔍 KanbanBoard - Iniciando busca de colaboradores...");
      setIsLoadingCollaborators(true);
      try {
        // Buscar na coleção users
        try {
          const usersCollection = collection(db, "users");
          const usersSnapshot = await getDocs(usersCollection);
          
          if (usersSnapshot.size > 0) {
            console.log("✅ KanbanBoard - Usando coleção users:", usersSnapshot.size, "usuários");
            
            const collaboratorsList = usersSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                uid: data.uid || doc.id,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                birthDate: data.birthDate?.toDate ? data.birthDate.toDate() : new Date(data.birthDate),
                hierarchyLevel: data.hierarchyLevel as HierarchyLevel,
                avatar: data.avatar,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
              } as Collaborator;
            });
            
            console.log("📋 KanbanBoard - Colaboradores carregados:", collaboratorsList.length);
            setCollaborators(collaboratorsList);
            return;
          }
        } catch (usersError) {
          console.log("⚠️ KanbanBoard - Erro ao buscar na coleção users:", usersError);
        }
        
        // Se não encontrou na coleção users, mostrar erro
        console.log("❌ KanbanBoard - Usuários não encontrados na coleção users");
        toast.error("Usuários não encontrados");
        setCollaborators([]);
        
      } catch (error) {
        console.error("❌ KanbanBoard - Erro ao buscar colaboradores:", error);
        toast.error("Não foi possível carregar os colaboradores");
        setCollaborators([
          {
            id: "1",
            uid: "1",
            firstName: "Maria",
            lastName: "Oliveira",
            email: "maria.oliveira@cerrado.com",
            birthDate: new Date(1985, 5, 12),
            hierarchyLevel: "Estagiário/Auxiliar" as HierarchyLevel,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]);
      } finally {
        setIsLoadingCollaborators(false);
      }
    };

    fetchCollaborators();
  }, []);


  const handleDragEnd = async (result: any) => {
    // Cliente Externo não pode arrastar tarefas
    if (userRole === "Cliente Externo") {
      return;
    }
    
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }
    
    const updatedTasks = [...tasks];
    const movedTask = updatedTasks.find(task => task.id === draggableId);
    
    if (!movedTask) return;
    
    updatedTasks.splice(updatedTasks.findIndex(task => task.id === draggableId), 1);
    
    const tasksInDestination = updatedTasks.filter(task => task.status === destination.droppableId);
    const destinationTasks = [
      ...tasksInDestination.slice(0, destination.index),
      {...movedTask, status: destination.droppableId as Task['status']},
      ...tasksInDestination.slice(destination.index)
    ];
    
    const finalTasks = updatedTasks.filter(task => task.status !== destination.droppableId);
    finalTasks.push(...destinationTasks);
    
    setTasks(finalTasks);
    
    try {
      // Converter o status do Kanban para o formato usado no sistema
      const systemStatus = mapKanbanStatusToSystemStatus(destination.droppableId);
      const oldSystemStatus = mapKanbanStatusToSystemStatus(source.droppableId);
      
      await updateDoc(doc(db, "tasks", draggableId), {
        status: systemStatus
      });

      // Criar log de auditoria para mudança de status
      await createTaskAuditLog(
        TASK_ACTIONS.MOVE_TASK,
        `Tarefa "${movedTask.title}" movida de "${oldSystemStatus}" para "${systemStatus}"`,
        draggableId,
        movedTask.title,
        {
          'Status': { from: oldSystemStatus, to: systemStatus }
        }
      );
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Não foi possível atualizar o status da tarefa");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTask(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!taskToEdit) return;
    const { name, value } = e.target;
    setTaskToEdit(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewTask(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSelectChange = (name: string, value: string) => {
    if (!taskToEdit) return;
    setTaskToEdit(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleDateChange = (date: Date | undefined) => {
    // Se não tiver data, limpar o valor
    if (!date) {
      setSelectedDate(undefined);
      setNewTask(prev => ({ ...prev, dueDate: '' }));
      return;
    }
    
    try {
      // Garantir que a data está em UTC para evitar problemas de fuso horário
      const utcDate = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        12, 0, 0, 0
      ));
      
      // Atualizar o estado do seletor de data
      setSelectedDate(utcDate);
      
      // Obter componentes da data
      const day = utcDate.getUTCDate().toString().padStart(2, '0');
      const month = (utcDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = utcDate.getUTCFullYear();
      
      // Criar string para armazenamento no formato YYYY-MM-DD
      const storageDate = `${year}-${month}-${day}`;
      
      // Atualizar o estado da tarefa
      setNewTask(prev => ({ ...prev, dueDate: storageDate }));
      
      console.log(`Data selecionada: ${day}/${month}/${year}, armazenada como: ${storageDate}`);
    } catch (error) {
      console.error("Erro ao processar a data:", error);
    }
  };

  const handleEditDateChange = (date: Date | undefined) => {
    if (!taskToEdit) return;
    
    // Se não tiver data, limpar o valor
    if (!date) {
      setTaskToEdit(prev => prev ? { ...prev, dueDate: '' } : null);
      return;
    }
    
    try {
      // Garantir que a data está em UTC para evitar problemas de fuso horário
      const utcDate = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        12, 0, 0, 0
      ));
      
      // Obter componentes da data
      const day = utcDate.getUTCDate().toString().padStart(2, '0');
      const month = (utcDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = utcDate.getUTCFullYear();
      
      // Criar string para armazenamento no formato YYYY-MM-DD
      const storageDate = `${year}-${month}-${day}`;
      
      // Atualizar o estado da tarefa
      setTaskToEdit(prev => prev ? { ...prev, dueDate: storageDate } : null);
      
      console.log(`Data editada: ${day}/${month}/${year}, armazenada como: ${storageDate}`);
    } catch (error) {
      console.error("Erro ao processar a data:", error);
    }
  };

  // Função para adicionar tarefa
  const handleAddTask = async () => {
    try {
      // Validar campos obrigatórios
      if (!newTask.title.trim()) {
        toast.error("Por favor, informe um título para a tarefa");
        return;
      }

      // Converter o status do Kanban para o status usado pelo sistema
      const systemStatus = mapKanbanStatusToSystemStatus(newTask.status);
      
      // Preparar dados para gravação
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        status: systemStatus,
        priority: newTask.priority,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate + 'T23:59:59.999Z') : null,
        assignedTo: newTask.assignee || currentUser.uid,
        assignedToName: newTask.assignee ? 
          (() => {
            const collaborator = collaborators.find(c => c.uid === newTask.assignee);
            if (collaborator) {
              // Mostrar apenas o firstName
              return collaborator.firstName || collaborator.email || 'Colaborador';
            }
            return currentUser.displayName || currentUser.email || 'Usuário';
          })() : 
          currentUser.displayName || currentUser.email || 'Usuário',
        clientId: null,
        clientName: null,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || currentUser.email || 'Usuário',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Salvar no Firebase
      const docRef = await addDoc(collection(db, "tasks"), taskData);
      
      // Inicializar processo de trâmites automaticamente
      try {
        await initializeTaskProcess(
          docRef.id,
          taskData.assignedTo,
          taskData.assignedToName
        );
      } catch (processError) {
        console.error('Erro ao inicializar processo:', processError);
        // Não falha a criação da tarefa se o processo não for inicializado
      }
      
      // Criar log de auditoria
      try {
        const auditMessage = `Nova tarefa criada: "${newTask.title}" - Status: ${systemStatus} - Prioridade: ${newTask.priority}`;
        await createTaskAuditLog(
          TASK_ACTIONS.CREATE_TASK,
          auditMessage,
          docRef.id,
          newTask.title
        );
      } catch (auditError) {
        console.error('❌ Erro na auditoria:', auditError);
      }
      
      // Enviar notificação WhatsApp asynchronously (não bloquear criação da tarefa)
      setTimeout(async () => {
        try {
          if (taskData.assignedTo && taskData.assignedTo !== currentUser.uid) {
            console.log('📱 Enviando notificação WhatsApp para nova tarefa...');
            
            // Format due date
            const dueDateFormatted = taskData.dueDate 
              ? format(taskData.dueDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : 'Não definido';
            
            // Create notification data
            const notification = whatsappNotificationService.createTaskAssignmentNotification({
              id: docRef.id,
              assignedTo: taskData.assignedTo,
              title: taskData.title,
              description: taskData.description || 'Sem descrição',
              dueDate: dueDateFormatted,
              priority: taskData.priority,
              clientName: taskData.clientName || 'Não especificado'
            });
            
            // Send notification
            const result = await whatsappNotificationService.sendNotification(notification);
            
            if (result.success) {
              console.log('✅ Notificação WhatsApp enviada com sucesso');
            } else {
              console.warn('⚠️ Falha no envio da notificação WhatsApp:', result.error);
            }
          }
        } catch (error) {
          console.error('❌ Erro ao enviar notificação WhatsApp:', error);
          // Não falha a criação da tarefa se a notificação falhar
        }
      }, 1000); // Delay de 1 segundo para não bloquear a criação
      
      // A tarefa será adicionada automaticamente via onSnapshot
      // Não precisa adicionar localmente para evitar duplicação
      
      // Limpar formulário
      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        assignee: '',
        clientId: '',
        clientName: ''
      });
      
      setIsAddDialogOpen(false);
      setSelectedDate(undefined);
      
      toast.success("Tarefa adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      toast.error("Não foi possível adicionar a tarefa");
    }
  };

  // Função para editar tarefa
  const handleEditTask = async () => {
    if (!taskToEdit) return;
    
    try {
      // Validar campos obrigatórios
      if (!taskToEdit.title.trim()) {
        toast.error("Por favor, informe um título para a tarefa");
        return;
      }

      // Encontrar a tarefa original para comparar mudanças
      const originalTask = tasks.find(t => t.id === taskToEdit.id);
      const changes: Record<string, { from: any; to: any }> = {};

      if (originalTask) {
        if (originalTask.title !== taskToEdit.title) {
          changes['Título'] = { from: originalTask.title, to: taskToEdit.title };
        }
        if (originalTask.description !== taskToEdit.description) {
          changes['Descrição'] = { from: originalTask.description || '', to: taskToEdit.description || '' };
        }
        if (originalTask.status !== taskToEdit.status) {
          changes['Status'] = { from: originalTask.status, to: taskToEdit.status };
        }
        if (originalTask.priority !== taskToEdit.priority) {
          changes['Prioridade'] = { from: originalTask.priority, to: taskToEdit.priority };
        }
        if (originalTask.dueDate !== taskToEdit.dueDate) {
          changes['Data de Vencimento'] = { from: originalTask.dueDate || 'Sem data', to: taskToEdit.dueDate || 'Sem data' };
        }
        if (originalTask.assignee !== taskToEdit.assignee) {
          changes['Responsável'] = { from: originalTask.assignedToName || 'Não atribuído', to: taskToEdit.assignedToName || 'Não atribuído' };
        }
      }

      // Converter o status do Kanban para o status usado pelo sistema
      const systemStatus = mapKanbanStatusToSystemStatus(taskToEdit.status);
      
      // Buscar nome do responsável se houver alteração
      let assignedToName = taskToEdit.assignedToName;
      if (taskToEdit.assignee && (!taskToEdit.assignedToName || taskToEdit.assignee !== taskToEdit.assignee)) {
        const collaborator = collaborators.find(c => c.uid === taskToEdit.assignee);
        if (collaborator) {
          // Mostrar apenas o firstName
          assignedToName = collaborator.firstName || collaborator.email || 'Colaborador';
        } else {
          // Se não encontrou o colaborador, usar o usuário atual como fallback
          assignedToName = currentUser?.displayName || currentUser?.email || 'Usuário';
        }
      }

      // Preparar dados para atualização
      const taskData = {
        title: taskToEdit.title,
        description: taskToEdit.description,
        status: systemStatus,
        priority: taskToEdit.priority,
        dueDate: taskToEdit.dueDate ? new Date(taskToEdit.dueDate + 'T23:59:59.999Z') : null,
        assignedTo: taskToEdit.assignee,
        assignedToName: assignedToName,
        clientId: taskToEdit.clientId || null,
        clientName: taskToEdit.clientName || null,
        updatedAt: new Date()
      };
      
      // Atualizar no Firebase
      await updateDoc(doc(db, "tasks", taskToEdit.id), taskData);
      
      // Criar log de auditoria
      const changeDetails = Object.keys(changes).length > 0 
        ? `Campos alterados: ${Object.keys(changes).join(', ')}`
        : 'Dados da tarefa atualizados';

      try {
        await createTaskAuditLog(
          TASK_ACTIONS.UPDATE_TASK,
          `Tarefa "${taskToEdit.title}" atualizada - ${changeDetails}`,
          taskToEdit.id,
          taskToEdit.title,
          changes
        );
      } catch (auditError) {
        console.error('❌ Erro na auditoria:', auditError);
      }
      
      // Atualizar na lista local
      setTasks(prev => 
        prev.map(task => 
          task.id === taskToEdit.id ? { ...taskToEdit, assignedToName, clientName: taskToEdit.clientName } : task
        )
      );
      
      setIsEditDialogOpen(false);
      toast.success("Tarefa atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Não foi possível atualizar a tarefa");
    }
  };

  // Função para abrir diálogo de edição
  const openEditDialog = (task: Task) => {
    setTaskToEdit(task);
    setIsEditDialogOpen(true);
  };

  // Função para abrir diálogo de trâmites
  const openProcessDialog = (task: Task) => {
    setSelectedTaskForProcess(task);
    setIsProcessDialogOpen(true);
  };

  // Função para confirmar exclusão
  const handleDeleteConfirm = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteConfirmOpen(true);
  };

  const handleArchiveTask = async (task: Task) => {
    try {
      if (task.status !== 'done') {
        toast.error('Apenas tarefas concluídas podem ser arquivadas');
        return;
      }

      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        archived: true,
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Criar log de auditoria
      await createTaskAuditLog(
        'ARCHIVE_TASK',
        `Tarefa "${task.title}" arquivada`,
        task.id,
        task.title,
        {
          status: { from: 'Concluída', to: 'Arquivada' }
        }
      );

      toast.success('Tarefa arquivada com sucesso');
    } catch (error) {
      console.error('Erro ao arquivar tarefa:', error);
      toast.error('Erro ao arquivar tarefa');
    }
  };

  // Função para executar exclusão
  const executeDelete = async () => {
    if (!taskToDelete) return;
    
    try {
      // Buscar dados da tarefa antes de excluir para auditoria
      const taskToDeleteData = tasks.find(task => task.id === taskToDelete);
      
      await deleteDoc(doc(db, "tasks", taskToDelete));
      
      // Criar log de auditoria
      if (taskToDeleteData) {
        await createTaskAuditLog(
          TASK_ACTIONS.DELETE_TASK,
          `Tarefa "${taskToDeleteData.title}" foi removida do sistema`,
          taskToDelete,
          taskToDeleteData.title
        );
      }
      
      setTasks(prev => prev.filter(task => task.id !== taskToDelete));
      toast.success("Tarefa excluída com sucesso");
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      toast.error("Não foi possível excluir a tarefa");
    }
  };

  // Função para verificar se o usuário pode visualizar todas as tarefas
  const canViewAllTasks = () => {
    // Se tiver dados do colaborador com permissões customizadas, usar essas
    if (currentCollaborator?.customPermissions) {
      return currentCollaborator.customPermissions.canViewAllTasks;
    }
    
    // Senão, usar verificação baseada no nível hierárquico numérico
    // Níveis 1, 2 e 3 podem ver todas as tarefas
    if (!userRole || typeof userRole !== 'string') return false;
    
    // Usar a função utilitária hasPermission
    return hasPermission(userRole as HierarchyLevel, 'view_all_tasks');
  };

  // Função para buscar histórico de tarefas
  const fetchTaskHistory = async () => {
    setIsLoadingHistory(true);
    try {
      let logsQuery;
      
      if (canViewAllTasks()) {
        // Para níveis superiores: buscar todos os logs de tarefas
        logsQuery = query(
          collection(db, 'auditLogs'),
          where('entityType', '==', 'task')
        );
      } else if (currentUser) {
        // Para usuários normais: buscar apenas logs das suas tarefas
        logsQuery = query(
          collection(db, 'auditLogs'),
          where('entityType', '==', 'task'),
          where('performedBy', '==', currentUser.uid)
        );
      } else {
        setAuditLogs([]);
        return;
      }
      
      const logsSnapshot = await getDocs(logsQuery);
      
      const logs = logsSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          action: data.action || '',
          performedBy: data.performedBy || '',
          performedByName: data.performedByName || '',
          performedOn: data.performedOn || '',
          timestamp: data.timestamp?.toDate() || new Date(),
          details: data.details || '',
          entityType: 'task' as const,
          changes: data.changes || {},
          taskTitle: data.taskTitle || '',
          taskId: data.taskId || ''
        };
      });

      // Ordenar os logs por timestamp no frontend
      logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setAuditLogs(logs);
      setFilteredAuditLogs(logs);
    } catch (error) {
      console.error('❌ Erro ao buscar histórico de tarefas:', error);
      setAuditLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Função para alternar visualização
  const handleToggleHistory = () => {
    if (!showHistory) {
      fetchTaskHistory();
    }
    setShowHistory(!showHistory);
  };

  // Efeito para filtrar logs de auditoria baseado nos filtros
  useEffect(() => {
    // Se não há filtros aplicados, mostrar todos os logs
    if (!historySearchTerm.trim() && !historyStartDate && !historyEndDate && historyStatusFilter === 'all') {
      setFilteredAuditLogs([...auditLogs]);
      return;
    }

    let filtered = [...auditLogs];

    // Filtro por status
    if (historyStatusFilter !== 'all') {
      filtered = filtered.filter(log => log.action === historyStatusFilter);
    }

    // Filtro por busca
    if (historySearchTerm.trim()) {
      const searchLower = historySearchTerm.toLowerCase().trim();
      filtered = filtered.filter(log => {
        const taskTitleMatch = log.taskTitle?.toLowerCase().includes(searchLower);
        const detailsMatch = log.details?.toLowerCase().includes(searchLower);
        const performedByNameMatch = log.performedByName?.toLowerCase().includes(searchLower);
        return taskTitleMatch || detailsMatch || performedByNameMatch;
      });
    }

    // Filtro por data inicial
    if (historyStartDate) {
      filtered = filtered.filter(log => {
        const logDate = log.timestamp instanceof Date 
          ? log.timestamp 
          : (log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : new Date(log.timestamp));
        const startOfDay = new Date(historyStartDate);
        startOfDay.setHours(0, 0, 0, 0);
        return logDate >= startOfDay;
      });
    }

    // Filtro por data final
    if (historyEndDate) {
      filtered = filtered.filter(log => {
        const logDate = log.timestamp instanceof Date 
          ? log.timestamp 
          : (log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : new Date(log.timestamp));
        const endOfDay = new Date(historyEndDate);
        endOfDay.setHours(23, 59, 59, 999);
        return logDate <= endOfDay;
      });
    }

    setFilteredAuditLogs(filtered);
  }, [auditLogs, historySearchTerm, historyStartDate, historyEndDate, historyStatusFilter]);

  // Função para formatar ações
  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      'CREATE_TASK': 'Tarefa criada',
      'UPDATE_TASK': 'Dados atualizados',
      'DELETE_TASK': 'Tarefa removida',
      'CHANGE_STATUS': 'Status alterado',
      'ASSIGN_TASK': 'Tarefa atribuída',
      'CHANGE_PRIORITY': 'Prioridade alterada',
      'UPDATE_DUE_DATE': 'Prazo alterado',
      'MOVE_TASK': 'Tarefa movida'
    };
    
    return actionMap[action.toUpperCase()] || action;
  };

  // Função para obter ícone da ação
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create_task':
        return <Circle className="h-5 w-5 text-green-600" />;
      case 'update_task':
        return <Edit className="h-5 w-5 text-blue-600" />;
      case 'delete_task':
        return <Trash2 className="h-5 w-5 text-red-600" />;
      case 'change_status':
        return <CheckCircle2 className="h-5 w-5 text-purple-600" />;
      case 'assign_task':
        return <User className="h-5 w-5 text-orange-600" />;
      case 'change_priority':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'move_task':
        return <ArrowLeft className="h-5 w-5 text-indigo-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  // Função para obter badge da ação
  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create_task':
        return <Badge variant="default" className="bg-green-100 text-green-800 text-sm">Criação</Badge>;
      case 'update_task':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 text-sm">Atualização</Badge>;
      case 'delete_task':
        return <Badge variant="destructive" className="text-sm">Exclusão</Badge>;
      case 'change_status':
        return <Badge variant="default" className="bg-purple-100 text-purple-800 text-sm">Status</Badge>;
      case 'assign_task':
        return <Badge variant="default" className="bg-orange-100 text-orange-800 text-sm">Atribuição</Badge>;
      case 'change_priority':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-sm">Prioridade</Badge>;
      case 'move_task':
        return <Badge variant="default" className="bg-indigo-100 text-indigo-800 text-sm">Movimentação</Badge>;
      default:
        return <Badge variant="secondary" className="text-sm">{action}</Badge>;
    }
  };

  return (
    <div className="kanban-management h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Botão de Voltar (quando está no histórico) */}
          {showHistory && (
            <Button 
              onClick={handleToggleHistory} 
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all"
              title="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <h1 className="text-xl font-semibold text-foreground">
            {showHistory ? 'Histórico de Tarefas' : 'Quadro de Tarefas'}
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          {/* Removido: toggle de visualizações */}
          
          {!showHistory && canViewAllTasks() && (
            <div className="flex items-center space-x-2">
              <Switch
                id="view-all-tasks"
                checked={viewAllTasks}
                onCheckedChange={setViewAllTasks}
              />
              <Label htmlFor="view-all-tasks">Visualizar todas as tarefas</Label>
            </div>
          )}
          
          {/* Botão de Histórico (quando não está no histórico) */}
          {!showHistory && (
            <Button 
              onClick={handleToggleHistory} 
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all"
              title="Histórico"
            >
              <History className="h-4 w-4" />
            </Button>
          )}
          
          {!showHistory && userRole !== "Cliente Externo" && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-red-500 hover:bg-red-600 text-white gap-2 responsive-button">
              <PlusCircle className="h-4 w-4" />
              Nova Tarefa
            </Button>
          )}
        </div>
      </div>

      {showHistory ? (
        // Visualização do Histórico
        <div className="flex-1 flex flex-col space-y-6 overflow-hidden overflow-y-auto">
          {isLoadingHistory ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Carregando histórico...</p>
              </div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-lg text-muted-foreground">
                Nenhum histórico de tarefas encontrado.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                As atividades de tarefas aparecerão aqui quando realizadas.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Stats */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 justify-items-center">
                <div className="p-4 rounded-lg bg-transparent hover:bg-accent/30 transition-colors">
                  <h3 className="text-xs font-medium text-muted-foreground mb-1">Total de Atividades</h3>
                  <p className="text-2xl font-bold text-foreground">
                    {historySearchTerm || historyStartDate || historyEndDate 
                      ? `${filteredAuditLogs.length} de ${auditLogs.length}` 
                      : auditLogs.length}
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-transparent hover:bg-accent/30 transition-colors">
                  <h3 className="text-xs font-medium text-muted-foreground mb-1">Período</h3>
                  <p className="text-sm text-foreground">
                    {filteredAuditLogs.length > 0 ? (
                      <>
                        {format(filteredAuditLogs[filteredAuditLogs.length - 1].timestamp, "dd/MM/yyyy", { locale: ptBR })} - {format(filteredAuditLogs[0].timestamp, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      auditLogs.length > 0 ? (
                        <>
                          {format(auditLogs[auditLogs.length - 1].timestamp, "dd/MM/yyyy", { locale: ptBR })} - {format(auditLogs[0].timestamp, "dd/MM/yyyy", { locale: ptBR })}
                        </>
                      ) : (
                        '-'
                      )
                    )}
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-transparent hover:bg-accent/30 transition-colors">
                  <h3 className="text-xs font-medium text-muted-foreground mb-1">Última Atividade</h3>
                  <p className="text-sm text-foreground">
                    {filteredAuditLogs.length > 0 ? (
                      format(filteredAuditLogs[0].timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    ) : (
                      auditLogs.length > 0 ? (
                        format(auditLogs[0].timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      ) : (
                        '-'
                      )
                    )}
                  </p>
                </div>
              </div>

              {/* Filtros */}
              <div className="mb-6 flex items-center justify-end gap-2">
                  {/* Busca */}
                  <div className="relative max-w-xl w-[400px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar por tarefa, detalhes ou responsável..."
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      className="pl-10 pr-4 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none hover:bg-accent/30 rounded-full transition-colors"
                    />
                  </div>
                  
                  {/* Filtro de status */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-9 w-9 rounded-full transition-all ${historyStatusFilter !== 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'}`}
                        title={historyStatusFilter !== 'all' ? `Filtro: ${historyStatusFilter === 'CREATE_TASK' ? 'Tarefa criada' : historyStatusFilter === 'UPDATE_TASK' ? 'Tarefa atualizada' : historyStatusFilter === 'DELETE_TASK' ? 'Tarefa excluída' : historyStatusFilter === 'CHANGE_STATUS' ? 'Status alterado' : historyStatusFilter === 'ASSIGN_TASK' ? 'Tarefa atribuída' : historyStatusFilter === 'ARCHIVE_TASK' ? 'Tarefa arquivada' : historyStatusFilter === 'RESTORE_TASK' ? 'Tarefa restaurada' : historyStatusFilter}` : "Filtro de status"}
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <div className="p-2">
                        <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os status</SelectItem>
                            <SelectItem value="CREATE_TASK">Tarefa criada</SelectItem>
                            <SelectItem value="UPDATE_TASK">Tarefa atualizada</SelectItem>
                            <SelectItem value="DELETE_TASK">Tarefa excluída</SelectItem>
                            <SelectItem value="CHANGE_STATUS">Status alterado</SelectItem>
                            <SelectItem value="ASSIGN_TASK">Tarefa atribuída</SelectItem>
                            <SelectItem value="ARCHIVE_TASK">Tarefa arquivada</SelectItem>
                            <SelectItem value="RESTORE_TASK">Tarefa restaurada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Data inicial */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-9 w-9 rounded-full transition-all ${historyStartDate ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'}`}
                        title={historyStartDate ? format(historyStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={historyStartDate}
                        onSelect={setHistoryStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* Data final */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-9 w-9 rounded-full transition-all ${historyEndDate ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'}`}
                        title={historyEndDate ? format(historyEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={historyEndDate}
                        onSelect={setHistoryEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* Botão limpar filtros */}
                  {(historyStartDate || historyEndDate || historySearchTerm || historyStatusFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setHistoryStartDate(undefined);
                        setHistoryEndDate(undefined);
                        setHistorySearchTerm('');
                        setHistoryStatusFilter('all');
                      }}
                      className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                      title="Limpar filtros"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
              </div>

              {/* Timeline */}
              <div className="space-y-6">
                {filteredAuditLogs.length === 0 && (historySearchTerm || historyStartDate || historyEndDate || historyStatusFilter !== 'all') ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Nenhum resultado encontrado com os filtros aplicados</p>
                  </div>
                ) : (
                  filteredAuditLogs.map((log, index) => (
                  <div key={log.id} className="relative">
                    <div className="flex gap-4">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className="flex-shrink-0 w-10 h-10 bg-background border-2 border-primary rounded-full flex items-center justify-center">
                          {getActionIcon(log.action)}
                        </div>
                        {index < auditLogs.length - 1 && (
                          <div className="w-px h-16 bg-border mt-2"></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 bg-card border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getActionBadge(log.action)}
                            <h3 className="font-semibold text-foreground">
                              {formatAction(log.action)}
                            </h3>
                          </div>
                          
                          <time className="text-sm text-muted-foreground">
                            {format(log.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </time>
                        </div>

                        {/* Título da tarefa */}
                        {log.taskTitle && (
                          <p className="text-lg font-medium text-primary mt-2">
                            📋 {typeof log.taskTitle === 'string' ? log.taskTitle : (typeof log.taskTitle === 'object' ? JSON.stringify(log.taskTitle) : String(log.taskTitle || ''))}
                          </p>
                        )}

                        {/* Detalhes */}
                        <p className="text-muted-foreground mt-2">
                          {typeof log.details === 'string' ? log.details : (typeof log.details === 'object' ? JSON.stringify(log.details || '') : String(log.details || ''))}
                        </p>

                        {/* Quem fez */}
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Realizado por: {typeof (log.performedByName || log.performedBy) === 'string' ? (log.performedByName || log.performedBy || 'Sistema') : String(log.performedByName || log.performedBy || 'Sistema')}
                        </p>

                        {/* Mudanças específicas */}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <h4 className="text-sm font-medium text-foreground mb-2">Alterações:</h4>
                            <div className="space-y-1">
                              {Object.entries(log.changes).map(([field, change]: [string, any]) => {
                                // Verificar se change é um objeto com from e to
                                if (change && typeof change === 'object' && 'from' in change && 'to' in change) {
                                  const fromValue = typeof change.from === 'object' ? JSON.stringify(change.from) : String(change.from || '');
                                  const toValue = typeof change.to === 'object' ? JSON.stringify(change.to) : String(change.to || '');
                                  return (
                                    <div key={field} className="text-xs">
                                      <span className="font-medium">{field}:</span>{' '}
                                      <span className="text-muted-foreground">"{fromValue}"</span> → <span className="text-primary">"{toValue}"</span>
                                    </div>
                                  );
                                }
                                // Se não for um objeto com from/to, renderizar como string
                                const changeValue = typeof change === 'object' ? JSON.stringify(change) : String(change || '');
                                return (
                                  <div key={field} className="text-xs">
                                    <span className="font-medium">{field}:</span>{' '}
                                    <span className="text-primary">{changeValue}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Visualização normal das tarefas
        isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Carregando tarefas...</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden">
              {columns.map(column => (
                <div key={column.id} className="flex flex-col">
                  <div className={`column-header rounded-t-lg ${column.bgColor} dark:bg-muted ${column.textColor} dark:text-foreground flex items-center gap-2 border-b ${column.color} dark:border-border`}>
                    {column.icon}
                    <h2 className="font-medium">{column.title}</h2>
                    <div className="ml-auto bg-white dark:bg-background rounded-full w-6 h-6 flex items-center justify-center text-xs text-black dark:text-foreground">
                      {tasks.filter(task => task.status === column.id).length}
                    </div>
                  </div>
                  
                  <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`column-content overflow-y-auto rounded-b-lg border-l border-r border-b ${column.color} dark:border-border bg-slate-50 dark:bg-muted/30`}
                      >
                        {tasks.filter(task => task.status === column.id).map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={userRole === "Cliente Externo"}>
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...(userRole !== "Cliente Externo" ? provided.draggableProps : {})}
                                {...(userRole !== "Cliente Externo" ? provided.dragHandleProps : {})}
                                className={`mb-3 shadow-sm border border-border hover:shadow-md transition-shadow responsive-card ${userRole !== "Cliente Externo" ? "cursor-pointer" : "cursor-default"}`}
                                onClick={(e) => {
                                  // Evita abrir o dialog se clicar no dropdown menu
                                  if (!(e.target as Element).closest('[data-dropdown-trigger]')) {
                                    openProcessDialog(task);
                                  }
                                }}
                              >
                                <CardHeader className="p-3">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-base font-semibold text-foreground text-truncate-responsive">
                                      {task.title}
                                    </CardTitle>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          className="h-8 w-8 p-0 responsive-button"
                                          data-dropdown-trigger
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          openProcessDialog(task);
                                        }}>
                                          <FileText className="mr-2 h-4 w-4" />
                                          <span>Ver Trâmites</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {userRole !== "Cliente Externo" && (
                                          <>
                                            <DropdownMenuItem onClick={(e) => {
                                              e.stopPropagation();
                                              openEditDialog(task);
                                            }}>
                                              <Edit className="mr-2 h-4 w-4" />
                                              <span>Editar</span>
                                            </DropdownMenuItem>
                                            {task.status === 'done' && (
                                              <DropdownMenuItem 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleArchiveTask(task);
                                                }}
                                                className="text-blue-600 dark:text-blue-400"
                                              >
                                                <Archive className="mr-2 h-4 w-4" />
                                                <span>Arquivar</span>
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteConfirm(task.id);
                                              }}
                                              className="text-red-600 dark:text-red-400"
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              <span>Excluir</span>
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  <CardDescription className="text-xs text-muted-foreground text-truncate-responsive">
                                    {task.description || "Sem descrição"}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="p-3 pt-0">
                                  <div className="flex flex-col gap-2">
                                    {task.dueDate && (
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <CalendarIcon className="h-3 w-3 mr-1" />
                                        <span className="text-truncate-responsive">Prazo: {parseToDisplayDate(task.dueDate)}</span>
                                      </div>
                                    )}
                                    
                                    {task.assignedToName && (
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <span className="text-truncate-responsive">Responsável: {task.assignedToName}</span>
                                      </div>
                                    )}

                                    {task.clientName && (
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <span className="text-truncate-responsive">Cliente: {task.clientName}</span>
                                      </div>
                                    )}
                                    
                                    <div className="flex justify-between items-center mt-1">
                                      <div 
                                        className={`responsive-badge text-xs px-2 py-1 rounded-full ${
                                          task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' : 
                                            task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' : 
                                            'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                        }`}
                                      >
                                        {task.priority === 'high' ? 'Alta' : 
                                          task.priority === 'medium' ? 'Média' : 'Baixa'}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )
      )}

      {/* Diálogo para adicionar tarefa */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Tarefa</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da nova tarefa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input 
                id="title" 
                name="title" 
                value={newTask.title} 
                onChange={handleInputChange} 
                placeholder="Título da tarefa"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={newTask.description} 
                onChange={handleInputChange} 
                placeholder="Descreva os detalhes da tarefa..."
                rows={4}
                className="resize-none"
              />
            </div>

            
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={newTask.status} 
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">A Fazer</SelectItem>
                  <SelectItem value="in-progress">Em Progresso</SelectItem>
                  <SelectItem value="review">Em Revisão</SelectItem>
                  <SelectItem value="done">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select 
                value={newTask.priority} 
                onValueChange={(value) => handleSelectChange("priority", value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Data de Vencimento</Label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Input
                    id="dueDate"
                    name="dueDate"
                    value={newTask.dueDate ? parseToDisplayDate(newTask.dueDate) : ''}
                    onChange={(e) => {
                      const inputDate = e.target.value;
                      setNewTask(prev => ({ ...prev, dueDate: formatDateForStorage(inputDate) }));
                    }}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="assignee">Responsável</Label>
              <Select 
                value={newTask.assignee} 
                onValueChange={(value) => handleSelectChange("assignee", value)}
              >
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={currentUser?.uid}>{currentUser?.displayName || "Você"}</SelectItem>
                  {collaborators
                    .filter(c => c.uid !== currentUser?.uid)
                    .map(collab => (
                      <SelectItem key={collab.uid} value={collab.uid}>
                        {collab.firstName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTask}>
              Adicionar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar tarefa */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
            <DialogDescription>
              Altere os detalhes da tarefa conforme necessário.
            </DialogDescription>
          </DialogHeader>
          
          {taskToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input 
                  id="edit-title" 
                  name="title" 
                  value={taskToEdit.title} 
                  onChange={handleEditInputChange} 
                  placeholder="Título da tarefa"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea 
                  id="edit-description" 
                  name="description" 
                  value={taskToEdit.description} 
                  onChange={handleEditInputChange} 
                  placeholder="Descreva os detalhes da tarefa..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={taskToEdit.status} 
                  onValueChange={(value) => handleEditSelectChange("status", value)}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">A Fazer</SelectItem>
                    <SelectItem value="in-progress">Em Progresso</SelectItem>
                    <SelectItem value="review">Em Revisão</SelectItem>
                    <SelectItem value="done">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Prioridade</Label>
                <Select 
                  value={taskToEdit.priority} 
                  onValueChange={(value) => handleEditSelectChange("priority", value)}
                >
                  <SelectTrigger id="edit-priority">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-dueDate">Data de Vencimento</Label>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Input
                      id="edit-dueDate"
                      name="dueDate"
                      value={taskToEdit.dueDate ? parseToDisplayDate(taskToEdit.dueDate) : ''}
                      onChange={(e) => {
                        const inputDate = e.target.value;
                        setTaskToEdit(prev => prev ? { ...prev, dueDate: formatDateForStorage(inputDate) } : null);
                      }}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : undefined}
                        onSelect={handleEditDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-assignee">Responsável</Label>
                <Select 
                  value={taskToEdit.assignee || ''} 
                  onValueChange={(value) => handleEditSelectChange("assignee", value)}
                >
                  <SelectTrigger id="edit-assignee">
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={currentUser?.uid}>{currentUser?.displayName || "Você"}</SelectItem>
                    {collaborators
                      .filter(c => c.uid !== currentUser?.uid)
                      .map(collab => (
                        <SelectItem key={collab.uid} value={collab.uid}>
                          {collab.firstName} {collab.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditTask}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Trâmites da Tarefa */}
      <TaskProcessDialog
        task={selectedTaskForProcess}
        isOpen={isProcessDialogOpen}
        onOpenChange={setIsProcessDialogOpen}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={executeDelete}
        title="Confirmar Exclusão"
        description="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  );
}