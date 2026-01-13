import { useState, useEffect } from "react";
import { db } from "@/config/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { Client, Task, Collaborator, TaskStatus, TaskPriority } from "@/types";

export type DashboardData = {
  clientsCount: number;
  clientsBreakdown: {
    regular: number;
    withFinancialData: number;
    prospects: number;
  };
  clientsByStatus: { name: string; value: number }[];
  tasksCount: number;
  completionRate: number;
  tasksByStatus: { name: string; value: number }[];
  tasksByPriority: { name: string; value: number }[];
  collaboratorsCount: number;
  tasksByCollaborator: { name: string; value: number }[];
  monthlyTaskCompletion: { name: string; value: number }[];
  urgentTasks: {
    id: string;
    title: string;
    priority: string;
    status: string;
    dueDate: Date;
    assignedToName: string;
  }[];
  upcomingEvents: {
    id: string;
    title: string;
    date: Date;
    participants: string[];
  }[];
};

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Buscar clientes regulares
        const clientsSnapshot = await getDocs(collection(db, "clients"));
        const clients = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];

        // 2. Buscar quantos clientes têm dados financeiros (para estatística, não para contagem total)
        let clientsWithFinancialDataCount = 0;
        try {
          const financialClientsSnapshot = await getDocs(collection(db, "financialClients"));
          clientsWithFinancialDataCount = financialClientsSnapshot.docs.length;
        } catch (error) {
          // Coleção não existe ou sem acesso
        }

        // 3. Buscar prospects (clientes potenciais - estes devem ser contados separadamente)
        let prospectClientsCount = 0;
        try {
          const prospectClientsSnapshot = await getDocs(collection(db, "prospectClients"));
          prospectClientsCount = prospectClientsSnapshot.docs.length;
        } catch (error) {
          // Coleção não existe ou sem acesso
        }

        // 4. Buscar tarefas
        const tasksSnapshot = await getDocs(collection(db, "tasks"));
        const tasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Task[];

        // Buscar usuários da coleção users
        let collaboratorsData: any[] = [];
        
        try {
          const usersSnapshot = await getDocs(collection(db, "users"));
          collaboratorsData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log(`✅ Dashboard: Usando coleção users - ${collaboratorsData.length} usuários`);
        } catch (error) {
          console.log('⚠️ Dashboard: Erro ao buscar usuários:', error);
          collaboratorsData = [];
        }

        // Calcular contagem total de clientes CORRETAMENTE:
        // - Clientes regulares (coleção "clients"): 33
        // - Prospects (coleção "prospectClients"): 0 - são clientes potenciais
        // - NÃO contar financialClients pois são duplicações dos clientes regulares
        const clientsCount = clients.length + prospectClientsCount;

        const tasksCount = tasks.length;
        
        // Calcular taxa de conclusão
        const completedTasks = tasks.filter(task => task.status === TaskStatus.Concluída).length;
        const completionRate = tasksCount > 0 ? Math.round((completedTasks / tasksCount) * 100) : 0;

        // Agrupar clientes por status
        const clientStatusCounts: Record<string, number> = {};
        clients.forEach(client => {
          const status = client.status || "Sem status";
          clientStatusCounts[status] = (clientStatusCounts[status] || 0) + 1;
        });
        const clientsByStatus = Object.entries(clientStatusCounts).map(([name, value]) => ({ name, value }));

        // Agrupar tarefas por status
        const taskStatusCounts: Record<string, number> = {};
        tasks.forEach(task => {
          const status = task.status || "Sem status";
          taskStatusCounts[status] = (taskStatusCounts[status] || 0) + 1;
        });
        const tasksByStatus = Object.entries(taskStatusCounts).map(([name, value]) => ({ name, value }));

        // Agrupar tarefas por prioridade
        const taskPriorityCounts: Record<string, number> = {};
        tasks.forEach(task => {
          const priority = task.priority || "Sem prioridade";
          taskPriorityCounts[priority] = (taskPriorityCounts[priority] || 0) + 1;
        });
        const tasksByPriority = Object.entries(taskPriorityCounts).map(([name, value]) => ({ name, value }));

        // Agrupar tarefas por colaborador
        const taskCollaboratorCounts: Record<string, number> = {};
        tasks.forEach(task => {
          if (task.assignedToName) {
            taskCollaboratorCounts[task.assignedToName] = (taskCollaboratorCounts[task.assignedToName] || 0) + 1;
          }
        });
        const tasksByCollaborator = Object.entries(taskCollaboratorCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 7);

        // Calcular conclusão mensal de tarefas (baseada em dados reais se disponíveis)
        const currentYear = new Date().getFullYear();
        const monthlyTaskCounts: Record<string, number> = {
          "Jan": 0, "Fev": 0, "Mar": 0, "Abr": 0, "Mai": 0, "Jun": 0, 
          "Jul": 0, "Ago": 0, "Set": 0, "Out": 0, "Nov": 0, "Dez": 0
        };
        
        // Contar tarefas concluídas por mês
        tasks.forEach(task => {
          if (task.status === TaskStatus.Concluída) {
            if (task.completedAt) {
              const completedDate = task.completedAt instanceof Date 
                ? task.completedAt 
                : new Date(task.completedAt);
              
              if (completedDate.getFullYear() === currentYear) {
                const monthIndex = completedDate.getMonth();
                const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                const monthName = monthNames[monthIndex];
                monthlyTaskCounts[monthName] = (monthlyTaskCounts[monthName] || 0) + 1;
              }
            }
          }
        });
        
        const monthlyTaskCompletion = Object.entries(monthlyTaskCounts)
          .map(([name, value]) => ({ name, value }));

        // Identificar tarefas urgentes
        const urgentTasks = tasks
          .filter(task => task.priority === TaskPriority.Alta || task.priority === TaskPriority.Urgente)
          .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return dateA - dateB;
          })
          .slice(0, 5)
          .map(task => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
            assignedToName: task.assignedToName || ""
          }));

        // Criar eventos próximos baseados em tarefas com datas próximas
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        const upcomingEvents = tasks
          .filter(task => {
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            return dueDate >= today && dueDate <= nextWeek;
          })
          .slice(0, 4)
          .map(task => {
            // Buscar colaboradores associados à tarefa
            const participants: string[] = [];
            
            if (task.assignedToName) {
              participants.push(task.assignedToName);
            }
            
            // Adicionar outros participantes se houver
            // Vamos lidar apenas com o assignedToName já que não temos involvedCollaborators no tipo Task
            
            return {
              id: task.id,
              title: task.title,
              date: new Date(task.dueDate as string | number | Date),
              participants: participants.length ? participants : ["Não atribuído"]
            };
          });

        const dashboardData = {
          clientsCount,
          clientsBreakdown: {
            regular: clients.length,
            withFinancialData: clientsWithFinancialDataCount,
            prospects: prospectClientsCount
          },
          clientsByStatus,
          tasksCount,
          completionRate,
          tasksByStatus,
          tasksByPriority,
          collaboratorsCount: collaboratorsData.length,
          tasksByCollaborator,
          monthlyTaskCompletion,
          urgentTasks,
          upcomingEvents
        };
        
        setData(dashboardData);
      } catch (err) {
        console.error("Erro ao buscar dados do dashboard:", err);
        setError("Não foi possível carregar os dados do dashboard.");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, isLoading, error };
};
