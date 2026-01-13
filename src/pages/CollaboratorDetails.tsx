import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ArrowLeft, Clock, CheckCircle, AlertCircle, Activity, Circle, Bell, User, Mail, Phone, MapPin, Calendar, Briefcase, Edit, Save, X, UserCircle, CheckCircle2, ExternalLink, Home, Users, FileText, Calendar as CalendarIcon, MessageCircle, Menu, Settings, KanbanSquare, CheckSquare, TrendingUp, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { Collaborator, Task, TaskStatus } from "@/types";
import { getTasksByAssignee, updateTask } from "@/services/taskService";
import ChartCard from "@/components/dashboard/ChartCard";
import { ChartContainer } from "@/components/ui/chart";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { SidebarProvider } from "@/contexts/SidebarContext";
import CustomSidebar from "@/components/CustomSidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/config/firebase";
import KanbanBoard from "@/components/KanbanBoard";
import { useTabCloseLogout } from "@/hooks/useTabCloseLogout";
import { ProductivityDashboard } from "@/components/ProductivityDashboard";
import { ProductivityGoalsManager } from "@/components/ProductivityGoalsManager";

// Interfaces para corrigir erros de linter
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'project' | 'system';
  read: boolean;
  createdAt: Date;
}

interface UserData {
  name: string;
  role: string;
  avatar: string;
}

const TASK_COLORS = {
  'Pendente': '#FF6B6B',
  'Em andamento': '#4A4E69',
  'Concluída': '#3DDC97',
  'Bloqueada': '#3DB2FF'
};

const TASK_ICONS = {
  [TaskStatus.Pendente]: <Circle className="h-4 w-4 text-red-500" />,
  [TaskStatus.EmAndamento]: <Activity className="h-4 w-4 text-yellow-500" />,
  [TaskStatus.Concluída]: <CheckCircle className="h-4 w-4 text-green-500" />,
  [TaskStatus.Bloqueada]: <AlertCircle className="h-4 w-4 text-blue-500" />
};

const CollaboratorDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [tasksByStatus, setTasksByStatus] = useState<{name: string; value: number}[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [averageCompletionTime, setAverageCompletionTime] = useState<number>(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<TaskStatus | "">("");
  const [activeTab, setActiveTab] = useState<"home" | "collaborators" | "clients" | "calendar" | "tasks" | "chatbot">("collaborators");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userData, setUserData] = useState<UserData>({
    name: "Usuário",
    role: "Administrador",
    avatar: "/placeholder.svg"
  });
  
  // Ativa o logout automático quando a guia é fechada
  useTabCloseLogout();
  
  // Buscar dados do colaborador
  useEffect(() => {
    const fetchCollaborator = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const docRef = doc(db, "collaborators_unified", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCollaborator({
            id: docSnap.id,
            uid: data.uid,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            birthDate: data.birthDate.toDate(),
            hierarchyLevel: data.hierarchyLevel,
            avatar: data.avatar || data.photoURL,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          });
        } else {
          toast.error("Colaborador não encontrado");
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Erro ao buscar colaborador:", error);
        toast.error("Erro ao carregar os dados do colaborador");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCollaborator();
  }, [id, navigate]);
  
  // Carregar dados do usuário logado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Buscar dados do usuário no Firestore - priorizar coleção unificada
        let userData = null;
        
        // Tentar buscar na coleção unificada primeiro
        const unifiedDoc = await getDoc(doc(db, "collaborators_unified", user.uid));
        if (unifiedDoc.exists()) {
          userData = unifiedDoc.data();
          console.log("🔍 CollaboratorDetails - Dados do usuário (unified):", userData);
        } else {
          // Fallback para coleção collaborators
          const userDoc = await getDoc(doc(db, "collaborators_unified", user.uid));
          
          if (userDoc.exists()) {
            userData = userDoc.data();
            console.log("🔍 CollaboratorDetails - Dados do usuário (collaborators):", userData);
          } else {
            // Se não encontrou na coleção unificada, definir dados padrão
            console.log("❌ CollaboratorDetails - Usuário não encontrado na coleção unificada");
          }
        }

        if (userData) {
          // Mostrar apenas o firstName
          const displayName = userData.firstName || "Usuário";
          
          setUserData({
            name: displayName,
            role: userData.hierarchyLevel || "Estagiário/Auxiliar",
            avatar: userData.avatar || userData.photoURL || "/placeholder.svg"
          });
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);
  
  // Buscar tarefas do colaborador
  useEffect(() => {
    if (!collaborator) return;
    
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const tasks = await getTasksByAssignee(collaborator.id);
        
        // Calcular contagem por status
        const statusCounts: Record<string, number> = {
          [TaskStatus.Pendente]: 0,
          [TaskStatus.EmAndamento]: 0,
          [TaskStatus.Concluída]: 0,
          [TaskStatus.Bloqueada]: 0
        };
        
        tasks.forEach(task => {
          statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
        });
        
        // Formatar dados para o gráfico
        const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        setTasksByStatus(statusData);
        
        // Calcular tempo médio de conclusão (para tarefas concluídas)
        const completedTasks = tasks.filter(task => task.status === TaskStatus.Concluída && task.completedAt);
        if (completedTasks.length > 0) {
          const totalDays = completedTasks.reduce((sum, task) => {
            const completionTime = task.completedAt!.getTime() - task.createdAt.getTime();
            return sum + (completionTime / (1000 * 60 * 60 * 24)); // convertendo para dias
          }, 0);
          
          setAverageCompletionTime(Math.round((totalDays / completedTasks.length) * 10) / 10);
        }
        
        setTasks(tasks);
      } catch (error) {
        console.error("Erro ao buscar tarefas:", error);
        toast.error("Erro ao carregar as tarefas do colaborador");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTasks();
  }, [collaborator]);
  
  // Função para gerar as iniciais a partir do nome
  const getAvatarInitials = (name: string): string => {
    if (!name || name === "Usuário") return "U";
    const nameParts = name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
  };
  
  const handleStatusChange = async () => {
    if (!selectedTask || !newStatus) return;
    
    try {
      setIsLoading(true);
      
      // Verificar se mudou para concluída
      const updateData: Partial<Task> = { 
        status: newStatus as TaskStatus
      };
      
      // Se estiver marcando como concluída, adicionar data de conclusão
      if (newStatus === TaskStatus.Concluída) {
        updateData.completedAt = new Date();
      }
      
      await updateTask(selectedTask.id, updateData);
      
      // Atualizar localmente a tarefa
      setTasks(prev => prev.map(task => 
        task.id === selectedTask.id ? { ...task, ...updateData } : task
      ));
      
      // Atualizar o gráfico
      const newTasksByStatus = [...tasksByStatus];
      // Diminuir contagem do status anterior
      const oldStatusIndex = newTasksByStatus.findIndex(s => s.name === selectedTask.status);
      if (oldStatusIndex !== -1) {
        newTasksByStatus[oldStatusIndex].value -= 1;
      }
      
      // Aumentar contagem do novo status
      const newStatusIndex = newTasksByStatus.findIndex(s => s.name === newStatus);
      if (newStatusIndex !== -1) {
        newTasksByStatus[newStatusIndex].value += 1;
      }
      
      setTasksByStatus(newTasksByStatus);
      setIsStatusDialogOpen(false);
      toast.success(`Status da tarefa atualizado para ${newStatus}`);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar o status da tarefa");
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {name}
      </text>
    );
  };
  
  const chartConfig = {
    [TaskStatus.Pendente]: { color: TASK_COLORS['Pendente'] },
    [TaskStatus.EmAndamento]: { color: TASK_COLORS['Em andamento'] },
    [TaskStatus.Concluída]: { color: TASK_COLORS['Concluída'] },
    [TaskStatus.Bloqueada]: { color: TASK_COLORS['Bloqueada'] }
  };
  
  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.Pendente:
        return <Badge variant="destructive">Pendente</Badge>;
      case TaskStatus.EmAndamento:
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Em andamento</Badge>;
      case TaskStatus.Concluída:
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Concluída</Badge>;
      case TaskStatus.Bloqueada:
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Bloqueada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  if (isLoading && !collaborator) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <CustomSidebar activeTab={activeTab} onTabChange={(tab) => {
            if (tab === "documents") {
              navigate("/documents");
              return;
            }
            setActiveTab(tab as any);
          }} />
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="bg-cerrado-green1 text-white p-3 h-[80px] shadow-md">
              <div className="flex justify-end items-center">
                <div className="flex items-center gap-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="relative p-2 rounded-full hover:bg-cerrado-green2 transition-colors">
                        <Bell size={20} />
                        {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3">
                            <span className="font-medium">{notification.title}</span>
                            <span className="text-sm text-gray-500">{notification.message}</span>
                            <span className="text-xs text-gray-400 mt-1">
                              {notification.createdAt.toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>
                          <span className="text-gray-500">Nenhuma notificação</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center gap-4 cursor-pointer">
                        <div className="flex flex-col items-end mr-2">
                          <span className="font-medium">{userData.name}</span>
                          <span className="text-xs opacity-80">{userData.role}</span>
                        </div>
                        <Avatar>
                          <AvatarImage src={userData.avatar} alt={userData.name} />
                          <AvatarFallback>{getAvatarInitials(userData.name)}</AvatarFallback>
                        </Avatar>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                        <span>Voltar ao Dashboard</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>
            <main className="flex-1 dashboard-content bg-background p-6 overflow-auto h-[calc(100vh-80px)]">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                  <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Skeleton className="h-10 w-72" />
                </div>
                <div className="grid gap-6">
                  <Skeleton className="h-48 w-full" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }
  
  if (!collaborator) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <CustomSidebar activeTab={activeTab} onTabChange={(tab) => {
            if (tab === "documents") {
              navigate("/documents");
              return;
            }
            setActiveTab(tab as any);
          }} />
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="bg-cerrado-green1 text-white p-3 h-[80px] shadow-md">
              <div className="flex justify-end items-center">
                <div className="flex items-center gap-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="relative p-2 rounded-full hover:bg-cerrado-green2 transition-colors">
                        <Bell size={20} />
                        {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3">
                            <span className="font-medium">{notification.title}</span>
                            <span className="text-sm text-gray-500">{notification.message}</span>
                            <span className="text-xs text-gray-400 mt-1">
                              {notification.createdAt.toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>
                          <span className="text-gray-500">Nenhuma notificação</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center gap-4 cursor-pointer">
                        <div className="flex flex-col items-end mr-2">
                          <span className="font-medium">{userData.name}</span>
                          <span className="text-xs opacity-80">{userData.role}</span>
                        </div>
                        <Avatar>
                          <AvatarImage src={userData.avatar} alt={userData.name} />
                          <AvatarFallback>{getAvatarInitials(userData.name)}</AvatarFallback>
                        </Avatar>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                        <span>Voltar ao Dashboard</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>
            <main className="flex-1 dashboard-content bg-background p-6 overflow-auto h-[calc(100vh-80px)]">
              <div className="flex items-center justify-center h-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Colaborador não encontrado</CardTitle>
                    <CardDescription>Não foi possível encontrar o colaborador solicitado.</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button onClick={() => navigate('/dashboard')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar para o Dashboard
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }
  
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <CustomSidebar activeTab={activeTab} onTabChange={(tab) => {
          if (tab === "documents") {
            navigate("/documents");
            return;
          }
          if (tab === "chatbot") {
            navigate("/dashboard", { state: { activeTab: "chatbot" } });
            return;
          }
          setActiveTab(tab as any);
        }} />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="bg-cerrado-green1 text-white p-3 h-[80px] shadow-md">
            <div className="flex justify-end items-center">
              <div className="flex items-center gap-4">
                <ThemeToggle variant="header" size="sm" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative p-2 rounded-full hover:bg-cerrado-green2 transition-colors">
                      <Bell size={20} />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3">
                          <span className="font-medium">{notification.title}</span>
                          <span className="text-sm text-gray-500">{notification.message}</span>
                          <span className="text-xs text-gray-400 mt-1">
                            {notification.createdAt.toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>
                        <span className="text-gray-500">Nenhuma notificação</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-4 cursor-pointer">
                      <div className="flex flex-col items-end mr-2">
                        <span className="font-medium">{userData.name}</span>
                        <span className="text-xs opacity-80">{userData.role}</span>
                      </div>
                      <Avatar>
                        <AvatarImage src={userData.avatar} alt={userData.name} />
                        <AvatarFallback>{getAvatarInitials(userData.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <span>Voltar ao Dashboard</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          <main className="flex-1 dashboard-content bg-background p-6 overflow-auto h-[calc(100vh-80px)]">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <h1 className="text-2xl font-bold">Detalhes do Colaborador</h1>
              </div>
              
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-6">
                    <Avatar className="w-28 h-28 border-2 border-gray-200">
                      <AvatarImage src={collaborator.avatar} />
                      <AvatarFallback className="text-2xl bg-blue-500 text-white">
                        {getAvatarInitials(collaborator.firstName + " " + collaborator.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <h2 className="text-2xl font-bold">{collaborator.firstName}</h2>
                          <p className="text-gray-500">{collaborator.email}</p>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock size={18} />
                          <span>Tempo de Execução (média): <span className="font-bold">{averageCompletionTime} dias</span></span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-500">Data de nascimento</p>
                          <p className="font-medium">{format(collaborator.birthDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Profissão</p>
                          <p className="font-medium">{collaborator.hierarchyLevel}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Cadastrado em</p>
                          <p className="font-medium">{format(collaborator.createdAt, 'dd/MM/yyyy', { locale: ptBR })}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tabs para diferentes seções */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Visão Geral
                  </TabsTrigger>
                  <TabsTrigger value="productivity" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Produtividade
                  </TabsTrigger>
                  <TabsTrigger value="goals" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Metas
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Tarefas
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ChartCard title="Distribuição de tarefas por status">
                      {isLoading ? (
                        <div className="h-64 flex items-center justify-center">
                          <Skeleton className="h-52 w-52 rounded-full" />
                        </div>
                      ) : (
                        <ChartContainer className="h-64" config={chartConfig}>
                          <PieChart>
                            <Pie
                              data={tasksByStatus}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={renderCustomizedLabel}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {tasksByStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={TASK_COLORS[entry.name as keyof typeof TASK_COLORS]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ChartContainer>
                      )}
                    </ChartCard>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Resumo de desempenho</CardTitle>
                        <CardDescription>
                          Resumo geral das atividades e progresso do colaborador
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Tarefas concluídas</span>
                            <span className="text-sm font-medium">
                              {tasks.filter(t => t.status === TaskStatus.Concluída).length} de {tasks.length}
                            </span>
                          </div>
                          <Progress 
                            value={tasks.length > 0 
                              ? (tasks.filter(t => t.status === TaskStatus.Concluída).length / tasks.length) * 100 
                              : 0
                            } 
                            className="h-2"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Tarefas em andamento</span>
                            <span className="text-sm font-medium">
                              {tasks.filter(t => t.status === TaskStatus.EmAndamento).length} de {tasks.length}
                            </span>
                          </div>
                          <Progress 
                            value={tasks.length > 0 
                              ? (tasks.filter(t => t.status === TaskStatus.EmAndamento).length / tasks.length) * 100 
                              : 0
                            } 
                            className="h-2 bg-yellow-100"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Tarefas pendentes</span>
                            <span className="text-sm font-medium">
                              {tasks.filter(t => t.status === TaskStatus.Pendente).length} de {tasks.length}
                            </span>
                          </div>
                          <Progress 
                            value={tasks.length > 0 
                              ? (tasks.filter(t => t.status === TaskStatus.Pendente).length / tasks.length) * 100 
                              : 0
                            } 
                            className="h-2 bg-red-100"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Tarefas bloqueadas</span>
                            <span className="text-sm font-medium">
                              {tasks.filter(t => t.status === TaskStatus.Bloqueada).length} de {tasks.length}
                            </span>
                          </div>
                          <Progress 
                            value={tasks.length > 0 
                              ? (tasks.filter(t => t.status === TaskStatus.Bloqueada).length / tasks.length) * 100 
                              : 0
                            } 
                            className="h-2 bg-blue-100"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="productivity" className="space-y-6">
                  <ProductivityDashboard 
                    collaboratorId={collaborator.id}
                    showTeamView={false}
                    showIndividualView={true}
                  />
                </TabsContent>

                <TabsContent value="goals" className="space-y-6">
                  <ProductivityGoalsManager
                    collaboratorId={collaborator.id}
                    collaborators={[collaborator]}
                    showTeamGoals={false}
                  />
                </TabsContent>

                <TabsContent value="tasks" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tarefas atribuídas</CardTitle>
                      <CardDescription>
                        Lista de todas as tarefas atribuídas a este colaborador
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {tasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>Nenhuma tarefa atribuída a este colaborador</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Título</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Prazo</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tasks.map((task) => (
                              <TableRow key={task.id}>
                                <TableCell>
                                  <div className="font-medium">{task.title}</div>
                                  <div className="text-sm text-gray-500">{task.description}</div>
                                </TableCell>
                                <TableCell>{task.clientName || "N/A"}</TableCell>
                                <TableCell>{format(task.dueDate, 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{getStatusBadge(task.status)}</TableCell>
                                <TableCell>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedTask(task);
                                          setNewStatus(task.status);
                                        }}
                                      >
                                        Alterar Status
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Alterar status da tarefa</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Selecione o novo status para a tarefa "{task.title}"
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      
                                      <div className="py-4">
                                        <Select
                                          defaultValue={task.status}
                                          onValueChange={(value) => setNewStatus(value as TaskStatus)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecione um status" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value={TaskStatus.Pendente}>
                                              <div className="flex items-center gap-2">
                                                {TASK_ICONS[TaskStatus.Pendente]}
                                                <span>Pendente</span>
                                              </div>
                                            </SelectItem>
                                            <SelectItem value={TaskStatus.EmAndamento}>
                                              <div className="flex items-center gap-2">
                                                {TASK_ICONS[TaskStatus.EmAndamento]}
                                                <span>Em andamento</span>
                                              </div>
                                            </SelectItem>
                                            <SelectItem value={TaskStatus.Concluída}>
                                              <div className="flex items-center gap-2">
                                                {TASK_ICONS[TaskStatus.Concluída]}
                                                <span>Concluída</span>
                                              </div>
                                            </SelectItem>
                                            <SelectItem value={TaskStatus.Bloqueada}>
                                              <div className="flex items-center gap-2">
                                                {TASK_ICONS[TaskStatus.Bloqueada]}
                                                <span>Bloqueada</span>
                                              </div>
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleStatusChange}>Salvar</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CollaboratorDetailsPage; 