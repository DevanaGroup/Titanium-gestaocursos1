import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Building, Clock, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate?: any;
  assignedTo?: string;
  assignedToName?: string;
  createdBy?: string;
  createdByName?: string;
  clientId?: string;
  clientName?: string;
  createdAt?: any;
  updatedAt?: any;
}

export default function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        // Usuário não logado, redirecionar para login
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchTask = async () => {
      if (!id || !currentUser) return;

      try {
        setLoading(true);
        const taskDoc = await getDoc(doc(db, 'tasks', id));
        
        if (!taskDoc.exists()) {
          setError('Tarefa não encontrada');
          return;
        }

        const taskData = taskDoc.data() as Task;
        setTask({
          id: taskDoc.id,
          ...taskData
        });
      } catch (error) {
        console.error('Erro ao buscar tarefa:', error);
        setError('Erro ao carregar a tarefa');
        toast.error('Não foi possível carregar a tarefa');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [id, currentUser]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Pendente':
        return {
          label: 'Pendente',
          color: 'bg-blue-100 text-blue-800',
          icon: <Circle className="w-4 h-4" />
        };
      case 'Em andamento':
        return {
          label: 'Em Andamento',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Clock className="w-4 h-4" />
        };
      case 'Bloqueada':
        return {
          label: 'Bloqueada',
          color: 'bg-red-100 text-red-800',
          icon: <AlertCircle className="w-4 h-4" />
        };
      case 'Concluída':
        return {
          label: 'Concluída',
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle2 className="w-4 h-4" />
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800',
          icon: <Circle className="w-4 h-4" />
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'alta':
      case 'high':
        return {
          label: 'Alta',
          color: 'bg-red-100 text-red-800'
        };
      case 'média':
      case 'medium':
        return {
          label: 'Média',
          color: 'bg-yellow-100 text-yellow-800'
        };
      case 'baixa':
      case 'low':
        return {
          label: 'Baixa',
          color: 'bg-green-100 text-green-800'
        };
      default:
        return {
          label: priority || 'Não definida',
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Não definida';
    
    try {
      // Se for um timestamp do Firestore
      if (date.toDate) {
        return format(date.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      }
      // Se for uma string
      if (typeof date === 'string') {
        return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
      }
      // Se for um objeto Date
      if (date instanceof Date) {
        return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      }
    } catch (error) {
      console.error('Erro ao formatar data:', error);
    }
    
    return 'Data inválida';
  };

  const formatDueDate = (date: any) => {
    if (!date) return 'Não definida';
    
    try {
      // Se for um timestamp do Firestore
      if (date.toDate) {
        return format(date.toDate(), "dd/MM/yyyy", { locale: ptBR });
      }
      // Se for uma string
      if (typeof date === 'string') {
        return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
      }
      // Se for um objeto Date
      if (date instanceof Date) {
        return format(date, "dd/MM/yyyy", { locale: ptBR });
      }
    } catch (error) {
      console.error('Erro ao formatar data:', error);
    }
    
    return 'Data inválida';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Tarefa não encontrada'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.priority);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Detalhes da Tarefa</h1>
      </div>

      {/* Card Principal */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">{task.title}</CardTitle>
              <CardDescription>ID: {task.id}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge className={statusConfig.color}>
                {statusConfig.icon}
                <span className="ml-1">{statusConfig.label}</span>
              </Badge>
              <Badge className={priorityConfig.color}>
                {priorityConfig.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {/* Descrição */}
            {task.description && (
              <div>
                <h3 className="font-semibold mb-2">Descrição</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}

            {/* Informações em Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Responsável */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Responsável
                </h4>
                <p className="text-muted-foreground">
                  {task.assignedToName || 'Não atribuído'}
                </p>
              </div>

              {/* Cliente */}
              {task.clientName && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Cliente
                  </h4>
                  <p className="text-muted-foreground">{task.clientName}</p>
                </div>
              )}

              {/* Data de Vencimento */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Vencimento
                </h4>
                <p className="text-muted-foreground">
                  {formatDueDate(task.dueDate)}
                </p>
              </div>

              {/* Criado por */}
              <div className="space-y-2">
                <h4 className="font-medium">Criado por</h4>
                <p className="text-muted-foreground">
                  {task.createdByName || 'Sistema'}
                </p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Criado em: </span>
                  {formatDate(task.createdAt)}
                </div>
                {task.updatedAt && (
                  <div>
                    <span className="font-medium">Atualizado em: </span>
                    {formatDate(task.updatedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-4">
        <Button onClick={() => navigate('/dashboard')}>
          Ir para Dashboard
        </Button>
      </div>
    </div>
  );
} 